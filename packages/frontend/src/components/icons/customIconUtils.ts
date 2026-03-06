import { createElement, type FC } from 'react';
import {
  RedFolderIcon,
  BlueFolderIcon,
  GreenFolderIcon,
  PurpleFolderIcon,
  OrangeFolderIcon,
  PinkFolderIcon,
  StarIcon,
  HeartIcon,
  MusicNoteIcon,
  CameraIcon,
  BookIcon,
  GameControllerIcon,
  CoffeeIcon,
  PlanetIcon,
  LightningIcon,
  FireIcon,
  SparkleIcon,
  ClockIcon,
  MailIcon,
  KeyIcon,
  LockIcon,
  GiftIcon,
  FlagIcon,
  LeafIcon,
  SunIcon,
  MoonIcon,
  CloudIcon,
  RainbowIcon,
  DiamondIcon,
  LightbulbIcon,
  RocketIcon,
  PaletteIcon,
  PencilIcon,
  TerminalIcon,
  PhotoIcon,
  HeadphonesIcon,
  HomeIcon,
} from './CustomIconLibrary';

interface IconProps {
  className?: string;
  size?: number;
}

export const CUSTOM_ICON_LIBRARY = {
  'folder-red': { component: RedFolderIcon, label: 'Red Folder', category: 'folders' },
  'folder-blue': { component: BlueFolderIcon, label: 'Blue Folder', category: 'folders' },
  'folder-green': { component: GreenFolderIcon, label: 'Green Folder', category: 'folders' },
  'folder-purple': { component: PurpleFolderIcon, label: 'Purple Folder', category: 'folders' },
  'folder-orange': { component: OrangeFolderIcon, label: 'Orange Folder', category: 'folders' },
  'folder-pink': { component: PinkFolderIcon, label: 'Pink Folder', category: 'folders' },
  star: { component: StarIcon, label: 'Star', category: 'symbols' },
  heart: { component: HeartIcon, label: 'Heart', category: 'symbols' },
  'music-note': { component: MusicNoteIcon, label: 'Music Note', category: 'media' },
  camera: { component: CameraIcon, label: 'Camera', category: 'media' },
  book: { component: BookIcon, label: 'Book', category: 'objects' },
  'game-controller': { component: GameControllerIcon, label: 'Game Controller', category: 'objects' },
  coffee: { component: CoffeeIcon, label: 'Coffee', category: 'objects' },
  planet: { component: PlanetIcon, label: 'Planet', category: 'nature' },
  lightning: { component: LightningIcon, label: 'Lightning', category: 'nature' },
  fire: { component: FireIcon, label: 'Fire', category: 'nature' },
  sparkle: { component: SparkleIcon, label: 'Sparkle', category: 'symbols' },
  clock: { component: ClockIcon, label: 'Clock', category: 'objects' },
  mail: { component: MailIcon, label: 'Mail', category: 'objects' },
  key: { component: KeyIcon, label: 'Key', category: 'objects' },
  lock: { component: LockIcon, label: 'Lock', category: 'objects' },
  gift: { component: GiftIcon, label: 'Gift', category: 'objects' },
  flag: { component: FlagIcon, label: 'Flag', category: 'objects' },
  leaf: { component: LeafIcon, label: 'Leaf', category: 'nature' },
  sun: { component: SunIcon, label: 'Sun', category: 'nature' },
  moon: { component: MoonIcon, label: 'Moon', category: 'nature' },
  cloud: { component: CloudIcon, label: 'Cloud', category: 'nature' },
  rainbow: { component: RainbowIcon, label: 'Rainbow', category: 'nature' },
  diamond: { component: DiamondIcon, label: 'Diamond', category: 'symbols' },
  lightbulb: { component: LightbulbIcon, label: 'Lightbulb', category: 'objects' },
  rocket: { component: RocketIcon, label: 'Rocket', category: 'objects' },
  palette: { component: PaletteIcon, label: 'Palette', category: 'objects' },
  pencil: { component: PencilIcon, label: 'Pencil', category: 'objects' },
  terminal: { component: TerminalIcon, label: 'Terminal', category: 'tech' },
  photo: { component: PhotoIcon, label: 'Photo', category: 'media' },
  headphones: { component: HeadphonesIcon, label: 'Headphones', category: 'media' },
  home: { component: HomeIcon, label: 'Home', category: 'objects' },
} as const;

export type CustomIconId = keyof typeof CUSTOM_ICON_LIBRARY;

export function getIconsByCategory() {
  const categories: Record<string, Array<{ id: CustomIconId; label: string; component: FC<IconProps> }>> = {};

  for (const [id, data] of Object.entries(CUSTOM_ICON_LIBRARY)) {
    if (!categories[data.category]) {
      categories[data.category] = [];
    }
    categories[data.category].push({
      id: id as CustomIconId,
      label: data.label,
      component: data.component,
    });
  }

  return categories;
}

export function renderCustomIcon(iconId: CustomIconId | string, size = 32, className?: string) {
  const iconData = CUSTOM_ICON_LIBRARY[iconId as CustomIconId];
  if (!iconData) return null;

  return createElement(iconData.component, { size, className });
}
