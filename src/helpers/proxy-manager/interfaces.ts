export type IProxyData = {
  nickname: string;
  hostname: string;
  port: number;
  createdAt: string;
  canLaunch?: boolean;
};

export type IProxyGroupData = {
  id: string;
  name: string;
  isNoGroup: boolean; // true if this is the total proxy list
  includedHosts: (string | IProxyData)[];
  createdAt: string;
  updatedAt: string;
};
