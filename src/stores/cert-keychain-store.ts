import { invoke } from "@tauri-apps/api/core";
import { appDataDir, BaseDirectory, homeDir } from "@tauri-apps/api/path";
import { UnwatchFn, watch } from "@tauri-apps/plugin-fs";
import { create } from "zustand";

export interface Certificate {
  sha1: string;
  sha256: string;
  keychain: string;
  name: string;
  subject: string;
  attributes: Record<string, string>;
}

export interface CertKeychainStore {
  watcher: UnwatchFn | null;
  certOnKeychain: Record<string, { exists: boolean; timestamp: number }>;
  foundCertificates: Certificate[];
  homeDir: string;
  appDataDir: string;
  init: () => Promise<void>;
  findExcatCertificateByName: (name: string) => Promise<Certificate | undefined>;
  checkCertExistOnKeychain: (name: string, shouldFetch?: boolean) => Promise<boolean>;
  removeCertFromKeychain: (name: string) => Promise<void>;
  removeCertBySha1: (sha1: string) => Promise<void>;
  addCertToKeychain: (pemFilePath: string) => Promise<void>;
  generateManualCommand: (name: string) => Promise<string>;
  findCertificates: (name: string) => Promise<Certificate[]>;
}

// cache for 5 seconds
const CACHE_TIME = 5000;

function parseCertificateOutput(output: string): Certificate[] {
  const certificates: Certificate[] = [];
  const blocks = output.split('SHA-256 hash:').filter(block => block.trim());

  for (const block of blocks) {
    try {
      const lines = block.split('\n').map(line => line.trim());
      const cert: Partial<Certificate> = {
        attributes: {},
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('SHA-1 hash:')) {
          cert.sha1 = line.split(':')[1].trim();
        } else if (i === 0) { // First line is SHA-256
          cert.sha256 = line.trim();
        } else if (line.startsWith('keychain:')) {
          cert.keychain = line.split(':')[1].trim().replace(/"/g, '');
        } else if (line.includes('"alis"<blob>=')) {
          cert.name = line.split('=')[1].trim().replace(/"/g, '');
        } else if (line.includes('"subj"<blob>=')) {
          cert.subject = line.split('=')[1].trim().replace(/"/g, '');
        } else if (line.includes('<blob>=')) {
          const [key, value] = line.split('<blob>=');
          cert.attributes![key.trim().replace(/"/g, '')] = value.trim().replace(/"/g, '');
        }
      }

      if (cert.sha1 && cert.name) {
        certificates.push(cert as Certificate);
      }
    } catch (error) {
      console.error('Failed to parse certificate block:', error);
    }
  }

  return certificates;
}

export const certKeychainStore = create<CertKeychainStore>((set, get) => ({
  watcher: null,
  certOnKeychain: {},
  foundCertificates: [],
  homeDir: '',
  appDataDir: '',
  init: async () => {
    const homeDirPath = await homeDir();
    const appDataDirPath = await appDataDir();
    set({ homeDir: homeDirPath, appDataDir: appDataDirPath });
    if (get().watcher) {
      console.warn('Watcher already exists');
      // call unwatchFn 
      get().watcher?.();
    }
    const unWatchFn = await watch('cert', (event) => {
      console.log('Event:', event);
      console.log(`Kind`, (event as any).kind);
    }, {
      baseDir: BaseDirectory.AppData,
      delayMs: 1000,
      recursive: true,
    });

    set({ watcher: unWatchFn });
  },
  findCertificates: async (name: string) => {
    try {
      const output = await invoke<string>('find_certificates', { name });
      const certificates = parseCertificateOutput(output);
      set({ foundCertificates: certificates });
      return certificates;
    } catch (error) {
      console.error('Failed to find certificates:', error);
      return [];
    }
  },
  /**
   * Check if the certificate exists on the keychain.
   * @param name 
   * @param shouldFetch 
   * @returns 
   */
  checkCertExistOnKeychain: async (name, shouldFetch = false) => {
    const now = Date.now();
    const cached = get().certOnKeychain[name];

    if (
      !shouldFetch &&
      cached &&
      now - cached.timestamp < CACHE_TIME
    ) {
      console.log(`Cached: ${name}`, cached.exists);
      return cached.exists;
    }

    const exists = await get().findExcatCertificateByName(name);

    set(state => ({
      ...state,
      certOnKeychain: {
        ...state.certOnKeychain,
        [name]: { exists: !!exists, timestamp: now }
      }
    }));

    return !!exists;
  },

  /**
   * Find exact certificate by name.
   * @param name 
   * @returns 
   */
  findExcatCertificateByName: async (name: string) => {
    const certificates = await get().findCertificates(name);
    return certificates.find(cert => cert.name === name);
  },
  /**
   * Remove requires the name of the certificate.
   * @param name 
   */
  removeCertFromKeychain: async (name) => {
    const certificates = await get().findCertificates(name);
    const exactMatch = certificates.find(cert => cert.name === name);

    if (!exactMatch) {
      throw new Error(`Certificate not found: ${name}`);
    }

    await get().removeCertBySha1(exactMatch.sha1);

    set(state => ({
      ...state,
      certOnKeychain: {
        ...state.certOnKeychain,
        [name]: { exists: false, timestamp: Date.now() }
      }
    }));
  },
  removeCertBySha1: async (sha1: string) => {
    await invoke('remove_cert_by_sha1', { sha1 });
  },
  /**
   * Adding requires path to the pem file.
   * @param name
   */
  addCertToKeychain: async (name) => {
    const appDataDirPath = get().appDataDir;
    const pemFilePath = `${appDataDirPath}/cert/${name}/cert.pem`;
    await invoke('add_cert_to_keychain', {
      pem_file_path: pemFilePath,
    });
  },
  /**
   * Generate manual command to add the certificate to the keychain.
   * @param name
   * @returns
   */
  generateManualCommand: async (name) => {
    const homeDirectory = get().homeDir;
    const appDataDirPath = get().appDataDir;

    const keychainPath = `${homeDirectory}/Library/Keychains/login.keychain-db`;
    const pemFilePath = `${appDataDirPath}/cert/${name}/cert.pem`;

    const command = `security add-trusted-cert -k ${keychainPath} \"${pemFilePath}\"`;
    return command;
  }
}));
