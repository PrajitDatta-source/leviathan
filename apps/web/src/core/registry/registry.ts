import type { Module } from "./module";

const modules: Module[] = [];

export function registerModule(module: Module) {
  modules.push(module);
}

export function getModules() {
  return modules;
}