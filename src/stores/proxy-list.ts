import { ProxyManager } from "@/helpers/proxy-manager";
import { DEFAULT_PROXY_GROUP_ID } from "@/helpers/proxy-manager/constants";
import {
  IProxyData,
  IProxyGroupData,
} from "@/helpers/proxy-manager/interfaces";
import { create } from "zustand";

interface ProxyListStore {
  totalProxyList: IProxyData[];
  proxyList: IProxyData[];
  groupList: IProxyGroupData[];
  selectedGroup: IProxyGroupData | null;
  load(): void;
  setProxyList: (proxyList: IProxyData[]) => void;
  removeProxyFromList: (proxy: IProxyData) => void;
  addProxyItem: (data: IProxyData, group?: IProxyGroupData) => void;
  addGroup: (groupName: string) => void;
  deleteGroup: (groupId: string) => void;
  updateGroup: (group: IProxyGroupData) => void;
  addProxyToGroup: (proxy: IProxyData, group: IProxyGroupData) => void;
  removeProxyFromGroup: (proxy: IProxyData, group: IProxyGroupData) => void;
  setSelectedGroup: (group: IProxyGroupData) => void;
}

function filterProxyFromGroup(allList: IProxyData[], group: IProxyGroupData) {
  if (group.isNoGroup) {
    // All
    return allList;
  }
  return allList.filter((el) => {
    return group.includedHosts.find((e) => e === el.hostname);
  });
}

function removeProxyItemFromGroupList(
  groupList: IProxyGroupData[],
  proxy: IProxyData
) {
  return groupList.map((group) => {
    const index = group.includedHosts.findIndex((el) => el === proxy.hostname);
    if (index !== -1) {
      group.includedHosts.splice(index, 1);
    }
    return group;
  });
}

const proxyListStore = create<ProxyListStore>((set, get) => ({
  totalProxyList: [],
  proxyList: [],
  groupList: [],
  selectedGroup: null,
  load: async () => {
    const mgr = ProxyManager.sharedManager();
    const list = await mgr.getProxies();
    const gList = await mgr.getGroups();
    set({
      groupList: gList,
      totalProxyList: list,
    });
    // if selectedGroup == null then set default group
    let selectedGroup = get().selectedGroup;
    if (!selectedGroup) {
      selectedGroup =
        gList.find((el) => el.id === DEFAULT_PROXY_GROUP_ID) ?? null;
      set({ selectedGroup });
    }
    // filter list from selectedGroup
    const filteredList = filterProxyFromGroup(list, selectedGroup!);
    set({ proxyList: filteredList });
  },
  setProxyList: (proxyList: IProxyData[]) => set({ proxyList }),
  removeProxyFromList: async (proxy: IProxyData) => {
    const mgr = ProxyManager.sharedManager();
    const _proxyList = await mgr.getProxies();
    const _groupList = await mgr.getGroups();
    const index = _proxyList.findIndex((el) => el.hostname === proxy.hostname);
    _proxyList.splice(index, 1);
    await mgr.saveProxies(_proxyList);
    const filteredList = filterProxyFromGroup(_proxyList, get().selectedGroup!);
    const updatedGroupList = removeProxyItemFromGroupList(_groupList, proxy);
    await mgr.saveGroups(updatedGroupList);
    set({ proxyList: filteredList, totalProxyList: _proxyList });
  },
  addGroup: async (groupName: string) => {
    const newGroupData: IProxyGroupData = {
      isNoGroup: false,
      id: Math.random().toString(36).substring(7),
      name: groupName,
      includedHosts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const mgr = ProxyManager.sharedManager();
    const _groupList = await mgr.getGroups();
    const _proxyList = await mgr.getProxies();
    _groupList.push(newGroupData);
    set({ groupList: _groupList, selectedGroup: newGroupData });
    const filteredList = _proxyList.filter((el) =>
      newGroupData.includedHosts.find((e) => e === el.hostname)
    );
    set({ proxyList: filteredList });
    mgr.saveGroups(_groupList);
  },
  updateGroup: async (group: IProxyGroupData) => {
    const mgr = ProxyManager.sharedManager();
    const _groupList = await mgr.getGroups();
    const groupIndex = _groupList.findIndex((el) => el.id === group.id);
    group.updatedAt = new Date().toISOString();
    _groupList[groupIndex] = group;
    await mgr.saveGroups(_groupList);
    set({ groupList: _groupList });
  },
  deleteGroup: async (groupId: string) => {
    const mgr = ProxyManager.sharedManager();
    const _groupList = await mgr.getGroups();
    const index = _groupList.findIndex((el) => el.id === groupId);
    _groupList.splice(index, 1);
    set({ groupList: _groupList });
    get().setSelectedGroup(_groupList[0]);
    await mgr.saveGroups(_groupList);
  },
  addProxyItem: async (data: IProxyData, group?: IProxyGroupData) => {
    const mgr = ProxyManager.sharedManager();
    const _proxyList = await mgr.getProxies();
    if (_proxyList.find((e: IProxyData) => e.hostname === data.hostname)) {
      // already exists
      return;
    }

    // add to proxy list
    _proxyList.push(data);

    // save proxy list
    await mgr.saveProxies(_proxyList);

    // // manipulate group
    // const _groupList = await mgr.getGroups();
    // debugger;
    // const targetGroup = _groupList.find((el) => el.id === group.id);

    // targetGroup!.includedHosts.push(data.hostname);
    // await mgr.saveGroups(_groupList);

    set({
      proxyList: _proxyList,
      totalProxyList: _proxyList,
    });
  },
  addProxyToGroup: async (proxy: IProxyData, group: IProxyGroupData) => {
    const mgr = ProxyManager.sharedManager();
    const _groupList = await mgr.getGroups();
    const _proxyList = await mgr.getProxies();
    const filterGroup = _groupList.find((el) => el.id === group.id);
    filterGroup!.includedHosts.push(proxy.hostname);
    await mgr.saveGroups(_groupList);
    const filteredList = filterProxyFromGroup(_proxyList, filterGroup!);
    set({ proxyList: filteredList, groupList: _groupList });
  },
  removeProxyFromGroup: async (proxy: IProxyData, group: IProxyGroupData) => {
    const mgr = ProxyManager.sharedManager();
    const _groupList = await mgr.getGroups();
    const _proxyList = await mgr.getProxies();
    const filterGroup = _groupList.find((el) => el.id === group.id);
    const index = filterGroup!.includedHosts.findIndex(
      (el) => el === proxy.hostname
    );
    filterGroup!.includedHosts.splice(index, 1);
    await mgr.saveGroups(_groupList);
    const filteredList = filterProxyFromGroup(_proxyList, filterGroup!);
    set({ proxyList: filteredList, groupList: _groupList });
  },
  setSelectedGroup: async (group: IProxyGroupData) => {
    const mgr = ProxyManager.sharedManager();
    const _groupList = await mgr.getGroups();
    const _proxyList = await mgr.getProxies();
    const filterGroup = _groupList.find((el) => el.id === group.id);
    const filteredList = filterProxyFromGroup(_proxyList, filterGroup!);
    set({ selectedGroup: group });
    set({ proxyList: filteredList });
  },
}));

export default proxyListStore;
