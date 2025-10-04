import { initializeOfflineModel } from "./ai/offlineModel.js";
import { initializeProxyModel } from "./ai/proxyModel.js";
import { initializePublicModel } from "./ai/publicModel.js";

let aiServices = {
  offline: null,
  proxy: null,
  public: null,
};

export function initializeAIOrchestrator() {
  initializeOfflineModel().then((model) => {
    aiServices.offline = model;
  });

  initializeProxyModel().then((client) => {
    aiServices.proxy = client;
  });

  initializePublicModel().then((client) => {
    aiServices.public = client;
  });
}

export async function analyzeCoinImages(files, options = {}) {
  if (aiServices.proxy) {
    try {
      return await aiServices.proxy.analyze(files, options);
    } catch (error) {
      console.warn("Proxy AI failed", error);
    }
  }

  if (aiServices.public) {
    try {
      return await aiServices.public.analyze(files, options);
    } catch (error) {
      console.warn("Public AI failed", error);
    }
  }

  if (aiServices.offline) {
    return aiServices.offline.analyze(files, options);
  }

  throw new Error("AI services are not ready yet.");
}