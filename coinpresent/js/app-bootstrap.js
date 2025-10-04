import { initializeStorage } from "./storage.js";
import { initializeCatalog } from "./catalog.js";
import { initializeMediaGallery } from "./builder/gallery.js";
import { initializeAIOrchestrator } from "./ai-orchestrator.js";
import { initializeMarketIntel } from "./market-intel.js";

(async function bootstrap() {
  try {
    await initializeStorage();
    await initializeCatalog();
    initializeMediaGallery();
    initializeAIOrchestrator();
    initializeMarketIntel();
    console.log("Coinpresent bootstrap completed");
  } catch (error) {
    console.error("Bootstrap failure", error);
  }
})();