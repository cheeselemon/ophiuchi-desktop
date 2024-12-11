import { invoke } from "@tauri-apps/api/core";
import { Button } from "../ui/button";

export default function Test_PasswordComponent() {
  return (
    <Button
      variant={"default"}
      onClick={async () => {
        try {
          //save
          await invoke("save_password", {
            app_name: "test_app", // "test_app" is the default value
            item_name: "test2",
            password: "test",
          });
          console.log("Saved password");
          const password = await invoke("get_password", {
            app_name: "test_app", // "test_app" is the default value
            item_name: "test2",
          });
          console.log("Retrieved password:", password);
          // await invoke("delete_password", {
          //   app_name: "test_app", // "test_app" is the default value
          //   item_name: "test2",
          // });
        } catch (error) {
          console.error("Error getting password:", error);
        }
      }}
    >
      Test
    </Button>
  );
}
