import { ProxyManager } from "@/helpers/proxy-manager";
import { DEFAULT_PROXY_GROUP_ID } from "@/helpers/proxy-manager/constants";
import {
  IProxyData,
  IProxyGroupData,
} from "@/helpers/proxy-manager/interfaces";
import { toast } from "sonner";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
interface ProxyListStore {
  totalProxyList: IProxyData[];
  proxyList: IProxyData[];
  groupList: IProxyGroupData[];
  selectedGroup: IProxyGroupData | null;
  load(): void;
  setProxyList: (proxyList: IProxyData[]) => void;
  updateProxyCanLaunch: (proxy: IProxyData, canLaunch: boolean) => void;
  deleteProxyFromList: (proxy: IProxyData) => void;
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

const proxyListStore = create<ProxyListStore>()(
  subscribeWithSelector((set, get) => {
    return {
      totalProxyList: [],
      proxyList: [],
      groupList: [],
      selectedGroup: null,
      load: async () => {
        const mgr = ProxyManager.sharedManager();
        const list = await mgr.getProxies();
        const gList = await mgr.getGroups();
        console.log(`load`, list, gList);
        set({
          groupList: gList,
          totalProxyList: list,
          proxyList: list,
        });
        // if selectedGroup == null then set default group
        let selectedGroup = get().selectedGroup;
        if (!selectedGroup) {
          selectedGroup =
            gList.find((el) => el.id === DEFAULT_PROXY_GROUP_ID) ?? null;
          set({ selectedGroup });
        }
      },
      setProxyList: (proxyList: IProxyData[]) => set({ proxyList }),
      updateProxyCanLaunch: async (proxy: IProxyData, canLaunch: boolean) => {
        console.log(`updateProxyCanLaunch`, proxy, canLaunch);
        const _totalProxyList = get().totalProxyList;
        const index = _totalProxyList.findIndex(
          (el) => el.hostname === proxy.hostname
        );
        _totalProxyList[index].canLaunch = canLaunch;
        set({ totalProxyList: [..._totalProxyList] });
      },
      deleteProxyFromList: async (proxy: IProxyData) => {
        const _proxyList = get().totalProxyList;
        const _groupList = get().groupList;
        const index = _proxyList.findIndex(
          (el) => el.hostname === proxy.hostname
        );
        _proxyList.splice(index, 1);
        for (const group of _groupList) {
          group.includedHosts = group.includedHosts.filter(
            (el) => el !== proxy.hostname
          );
        }
        toast.success("Proxy Deleted");
        set({
          proxyList: [..._proxyList],
          totalProxyList: [..._proxyList],
          groupList: [..._groupList],
        });
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
        const _groupList = get().groupList;
        set({
          groupList: [..._groupList, newGroupData],
          selectedGroup: newGroupData,
        });
        const filteredList = get().totalProxyList.filter((el) =>
          newGroupData.includedHosts.find((e) => e === el.hostname)
        );
        set({ proxyList: filteredList });
        toast.success("Group Created");
      },
      updateGroup: async (group: IProxyGroupData) => {
        const _groupList = get().groupList;
        const groupIndex = _groupList.findIndex((el) => el.id === group.id);
        group.updatedAt = new Date().toISOString();
        _groupList[groupIndex] = group;
        toast.success("Group Updated");
        set({ groupList: [..._groupList] });
      },
      deleteGroup: async (groupId: string) => {
        const _groupList = get().groupList;
        const index = _groupList.findIndex((el) => el.id === groupId);
        _groupList.splice(index, 1);
        set({ groupList: [..._groupList] });
        get().setSelectedGroup(_groupList[0]);
        toast.success("Group Deleted");
      },
      addProxyItem: async (data: IProxyData, group?: IProxyGroupData) => {
        const _proxyList = get().totalProxyList;
        if (_proxyList.find((e: IProxyData) => e.hostname === data.hostname)) {
          // same hostname already exists
          toast.error("Proxy with same hostname already exists");
          return;
        }
        // add to proxy list
        _proxyList.push(data);
        set({
          totalProxyList: [..._proxyList],
        });
        toast.success("Proxy Created");
      },
      addProxyToGroup: async (proxy: IProxyData, group: IProxyGroupData) => {
        const _groupList = get().groupList;
        const filterGroup = _groupList.find((el) => el.id === group.id);
        if (!filterGroup) {
          toast.error("Group not found");
          return;
        }
        if (filterGroup!.includedHosts.find((el) => el === proxy.hostname)) {
          // already exists
          toast.error("Proxy already exists in group");
          return;
        }
        filterGroup!.includedHosts.push(proxy.hostname);
        if (filterGroup.id === get().selectedGroup?.id) {
          const filteredList = filterProxyFromGroup(
            get().totalProxyList,
            filterGroup
          );
          set({ proxyList: filteredList });
        }
        set({ groupList: [..._groupList] });
        console.log(`addProxyToGroup`, proxy, _groupList);
        toast.success("Proxy Added to Group");
      },
      removeProxyFromGroup: async (
        proxy: IProxyData,
        group: IProxyGroupData
      ) => {
        const _groupList = get().groupList;
        const filterGroup = _groupList.find((el) => el.id === group.id);
        if (!filterGroup) {
          toast.error("Group not found");
          return;
        }
        const index = filterGroup!.includedHosts.findIndex(
          (el) => el === proxy.hostname
        );
        filterGroup!.includedHosts.splice(index, 1);
        if (filterGroup.id === get().selectedGroup?.id) {
          const filteredList = filterProxyFromGroup(
            get().totalProxyList,
            filterGroup
          );
          set({ proxyList: filteredList });
        }
        set({ groupList: [..._groupList] });
        toast.success("Proxy Removed from Group", {
          description: "Click Undo to add it back.",
          action: {
            label: "Undo",
            onClick: () => {
              get().addProxyToGroup(proxy, group);
            },
          },
        });
      },
      setSelectedGroup: async (group: IProxyGroupData) => {
        set({ selectedGroup: group });
      },
    };
  })
);

proxyListStore.subscribe(
  (state) => state.selectedGroup,
  async (selectedGroup) => {
    if (selectedGroup) {
      const totalProxyList = proxyListStore.getState().totalProxyList;
      const filteredList = filterProxyFromGroup(totalProxyList, selectedGroup);
      proxyListStore.setState({ proxyList: filteredList });
    }
  }
);

proxyListStore.subscribe(
  (state) => state.totalProxyList,
  async (totalProxyList) => {
    const get = proxyListStore.getState();
    const mgr = ProxyManager.sharedManager();
    await mgr.saveProxies(totalProxyList);
    if (get.selectedGroup) {
      const filteredList = filterProxyFromGroup(
        totalProxyList,
        get.selectedGroup
      );
      proxyListStore.setState({ proxyList: filteredList });
    }
    console.log(`totalProxyList saved`, totalProxyList);
  }
);

proxyListStore.subscribe(
  (state) => state.proxyList,
  async (proxyList) => {
    console.log(`proxyList updated`, proxyList);
  }
);

proxyListStore.subscribe(
  (state) => state.groupList,
  async (groupList) => {
    const mgr = ProxyManager.sharedManager();
    await mgr.saveGroups(groupList);
    console.log(`groupList saved`, groupList);
  }
);

export default proxyListStore;
