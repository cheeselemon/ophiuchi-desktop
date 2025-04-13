import dynamic from "next/dynamic";

function EndpointListPage() {
  return (
    <p>This is a test page</p>
  );
}

export default dynamic(() => Promise.resolve(EndpointListPage), {
  ssr: false,
});
