// Barrel export for modular icon system
// This enables tree shaking and better bundle optimization

// Action Icons - Interactive and functional icons
export {
  downloadIcon,
  pauseIcon,
  playIcon,
  stopIcon,
  uploadIcon,
} from "./action-icons";
// Navigation Icons - Directional and navigation icons
export {
  arrowLeftIcon,
  arrowRightIcon,
  chevronDownIcon,
  chevronLeftIcon,
  chevronRightIcon,
  chevronUpIcon,
} from "./navigation-icons";
// UI Icons - Interface and user experience icons
export { searchIcon, settingsIcon, usersIcon } from "./ui-icons";

// Dynamic icon loader for code splitting
export const loadIconCategory = async (
  category: "ui" | "action" | "navigation",
) => {
  switch (category) {
    case "ui":
      return import("./ui-icons");
    case "action":
      return import("./action-icons");
    case "navigation":
      return import("./navigation-icons");
    default:
      throw new Error(`Unknown icon category: ${category}`);
  }
};

// Icon registry for runtime loading
export interface IconMetadata {
  category: string;
  name: string;
  description: string;
}

export const iconRegistry: Record<string, IconMetadata> = {
  usersIcon: {
    category: "ui",
    name: "users",
    description: "User management icon",
  },
  settingsIcon: {
    category: "ui",
    name: "settings",
    description: "Settings and configuration",
  },
  searchIcon: {
    category: "ui",
    name: "search",
    description: "Search and find functionality",
  },
  playIcon: {
    category: "action",
    name: "play",
    description: "Play or start action",
  },
  pauseIcon: {
    category: "action",
    name: "pause",
    description: "Pause or suspend action",
  },
  stopIcon: {
    category: "action",
    name: "stop",
    description: "Stop or end action",
  },
  downloadIcon: {
    category: "action",
    name: "download",
    description: "Download file or data",
  },
  uploadIcon: {
    category: "action",
    name: "upload",
    description: "Upload file or data",
  },
  chevronLeftIcon: {
    category: "navigation",
    name: "chevron-left",
    description: "Navigate left",
  },
  chevronRightIcon: {
    category: "navigation",
    name: "chevron-right",
    description: "Navigate right",
  },
  chevronUpIcon: {
    category: "navigation",
    name: "chevron-up",
    description: "Navigate up",
  },
  chevronDownIcon: {
    category: "navigation",
    name: "chevron-down",
    description: "Navigate down",
  },
  arrowLeftIcon: {
    category: "navigation",
    name: "arrow-left",
    description: "Move or go left",
  },
  arrowRightIcon: {
    category: "navigation",
    name: "arrow-right",
    description: "Move or go right",
  },
};
