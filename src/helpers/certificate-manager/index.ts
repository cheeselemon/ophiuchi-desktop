import { resolveResource } from "@tauri-apps/api/path";
import {
  BaseDirectory,
  exists,
  mkdir,
  readTextFile,
  remove,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import * as selfsigned from "selfsigned";

let instance: CertificateManager | null = null;

export class CertificateManager {
  async deleteCertificateFiles(hostname: string) {
    await remove(`cert/${hostname}`, {
      baseDir: BaseDirectory.AppData,
      recursive: true,
    });
  }

  async deleteAllNginxConfigurationFiles() {
    await remove(`conf/conf.d`, {
      baseDir: BaseDirectory.AppData,
      recursive: true,
    });
  }

  async deleteNginxConfigurationFiles(hostname: string) {
    if (
      !(await exists(`conf/conf.d/${hostname}.conf`, {
        baseDir: BaseDirectory.AppData,
      }))
    ) {
      return;
    }
    await remove(`conf/conf.d/${hostname}.conf`, {
      baseDir: BaseDirectory.AppData,
    });
  }

  async generateNginxConfigurationFiles(hostname: string, port: number) {
    // save to file
    if (
      !(await exists(`conf/conf.d`, {
        baseDir: BaseDirectory.AppData,
      }))
    ) {
      await mkdir(`conf/conf.d`, {
        baseDir: BaseDirectory.AppData,
        recursive: true,
      });
    }

    // read nginx conf file from bundle
    const nginxDefaultConfigPath = await resolveResource(
      "bundle/templates/default.nginx.conf.template"
    );
    const nginxDefaultConfigTemplate = await readTextFile(
      nginxDefaultConfigPath
    );

    await writeTextFile(`conf/nginx.conf`, nginxDefaultConfigTemplate, {
      baseDir: BaseDirectory.AppData,
    });

    // read nginx file from bundle
    const nginxConfigPath = await resolveResource(
      "bundle/templates/server.conf.template"
    );
    const nginxConfigTemplate = await readTextFile(nginxConfigPath);

    // replace all occurences of {DOMAIN_NAME} with hostname
    const upstreamSuffixUpdated = nginxConfigTemplate.replace(
      /{UPSTREAM_SUFFIX}/g,
      hostname.replace(/\./g, "_")
    );
    // replace all occurences of {DOMAIN_NAME} with hostname
    const nginxConfig = upstreamSuffixUpdated.replace(
      /{DOMAIN_NAME}/g,
      hostname
    );
    // replace all occurences of {PORT} with port
    const nginxConfigWithPort = nginxConfig.replace(/{PORT}/g, port.toString());

    await writeTextFile(`conf/conf.d/${hostname}.conf`, nginxConfigWithPort, {
      baseDir: BaseDirectory.AppData,
    });
  }
  constructor() {
    // init
  }

  public static shared(): CertificateManager {
    if (instance === null) {
      instance = new CertificateManager();
    }
    return instance;
  }

  public async generateCertificate(hostname: string) {
    var attrs = [{ name: "commonName", value: hostname }];
    interface IPems {
      private: string;
      public: string;
      cert: string;
    }
    const pems: IPems = await new Promise((resolve) => {
      var pems = selfsigned.generate(attrs, {
        days: 3650,
        algorithm: "sha256",
        keySize: 1024,
        extensions: [
          {
            name: "subjectAltName",
            altNames: [
              { type: 2, value: hostname },
              { type: 7, ip: "127.0.0.1" },
            ],
          },
        ],
        pkcs7: true, // include PKCS#7 as part of the output (default: false) });
      });
      resolve(pems);
    });

    // save to file
    if (
      !(await exists(`cert/${hostname}`, {
        baseDir: BaseDirectory.AppData,
      }))
    ) {
      await mkdir(`cert/${hostname}`, {
        baseDir: BaseDirectory.AppData,
        recursive: true,
      });
    }

    // write public
    await writeTextFile(`cert/${hostname}/public.crt`, pems.public, {
      baseDir: BaseDirectory.AppData,
    });

    // write key
    await writeTextFile(`cert/${hostname}/private.key`, pems.private, {
      baseDir: BaseDirectory.AppData,
    });

    // write cert
    await writeTextFile(`cert/${hostname}/cert.pem`, pems.cert, {
      baseDir: BaseDirectory.AppData,
    });

    return pems;
  }
}
