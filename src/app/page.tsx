import ProxyListComponent from "@/components/page-components/proxy-list";
import dynamic from "next/dynamic";

function Home() {
  return <ProxyListComponent />;
}

export default dynamic(() => Promise.resolve(Home), {
  ssr: false,
});
