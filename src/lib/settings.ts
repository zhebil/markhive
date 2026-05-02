export type Settings = {
  includeFrontmatter: boolean;
  includeThinking: boolean;
  includeToolInputs: boolean;
  includeToolResults: boolean;
  filenameTemplate: "date-title";
};

export const DEFAULTS: Settings = {
  includeFrontmatter: true,
  includeThinking: false,
  includeToolInputs: false,
  includeToolResults: false,
  filenameTemplate: "date-title",
};

const STORAGE_KEY = "markhive";

export async function loadSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const saved = result[STORAGE_KEY] as Partial<Settings> | undefined;
      resolve({ ...DEFAULTS, ...saved });
    });
  });
}

export async function saveSettings(s: Settings): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: s }, resolve);
  });
}
