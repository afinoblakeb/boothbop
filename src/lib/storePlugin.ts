import { registerPlugin } from "@capacitor/core";

// JS bridge to our own native StoreKit 2 plugin (AppDelegate.swift →
// BoothBopStore). Registered in code via registerPluginInstance, like our other
// local plugins, so it dodges the Capacitor 8 + SPM auto-registration failure.

export interface StoreProduct {
  id: string;
  displayName: string;
  description: string;
  price: string; // localized, e.g. "$0.99"
}

export interface BoothBopStorePlugin {
  getProducts(options: {
    productIds: string[];
  }): Promise<{ products: StoreProduct[] }>;
  purchase(options: {
    productId: string;
  }): Promise<{ status: string; purchased: boolean }>;
  restore(): Promise<{ restored: boolean }>;
  isPurchased(options: { productId: string }): Promise<{ purchased: boolean }>;
}

export const BoothBopStore =
  registerPlugin<BoothBopStorePlugin>("BoothBopStore");
