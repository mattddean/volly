import { mainMenu } from "./cli";

console.log("Starting Volleyball Matchmaker...");

// Start the application with the main menu
mainMenu().catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});
