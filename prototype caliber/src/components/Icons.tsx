import type { SVGProps } from "react";

// One drawn icon set: 20px grid, 1.6 stroke, round joins.
const P = (props: SVGProps<SVGSVGElement>) => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props} />
);

export const IconGauge = () => <P><path d="M3 14a7 7 0 1 1 14 0" /><path d="M10 14l3.5-4.5" /><path d="M3 17h14" /></P>;
export const IconTag = () => <P><path d="M6 2.5h8l3 3V17.5H3V5.5z" /><circle cx="10" cy="5" r="1.2" /><path d="M6 10h8M6 13h5" /></P>;
export const IconSearchDoc = () => <P><path d="M11 17.5H4.5v-15h7l3 3V8" /><circle cx="13" cy="13" r="2.8" /><path d="M15.1 15.1L17.5 17.5" /></P>;
export const IconClipboard = () => <P><rect x="4" y="3.5" width="12" height="14" rx="1.5" /><path d="M7.5 3.5V2.5h5v1" /><path d="M7 11l2 2 4-4.5" /></P>;
export const IconFile = () => <P><path d="M12 2.5H5v15h10V5.5z" /><path d="M12 2.5v3h3" /><path d="M7.5 10h5M7.5 13h5" /></P>;
export const IconConflict = () => <P><path d="M4 4l5 5M4 9V4h5" /><path d="M16 16l-5-5M16 11v5h-5" /><path d="M16 4l-5 5" /></P>;
export const IconInfo = () => <P><circle cx="10" cy="10" r="7.5" /><path d="M10 9v5M10 6.2v.1" /></P>;
export const IconWarn = () => <P><path d="M10 3l7.5 13.5h-15z" /><path d="M10 8.5v3.5M10 14.3v.1" /></P>;
export const IconLock = () => <P><rect x="4.5" y="9" width="11" height="8.5" rx="1.5" /><path d="M7 9V6.5a3 3 0 0 1 6 0V9" /></P>;
export const IconCheck = () => <P><path d="M4 10.5l4 4 8-9" /></P>;
export const IconX = () => <P><path d="M5 5l10 10M15 5L5 15" /></P>;
export const IconReset = () => <P><path d="M3.5 9a6.5 6.5 0 1 1 1.6 5" /><path d="M3 4.5V9h4.5" /></P>;
export const IconDownload = () => <P><path d="M10 3v10M6 9.5l4 4 4-4" /><path d="M3.5 16.5h13" /></P>;
export const IconSpark = () => <P><path d="M10 2.5v4M10 13.5v4M2.5 10h4M13.5 10h4" /><path d="M10 7.5l1 1.5 1.5 1-1.5 1-1 1.5-1-1.5-1.5-1 1.5-1z" /></P>;
export const IconBolt = () => <P><path d="M11 2.5L4.5 11H10l-1 6.5L15.5 9H10z" /></P>;
export const IconDatabase = () => <P><ellipse cx="10" cy="5" rx="6" ry="2.5" /><path d="M4 5v10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V5" /><path d="M4 10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5" /></P>;
export const IconArrow = () => <P><path d="M4 10h12M11.5 5.5L16 10l-4.5 4.5" /></P>;
export const IconClock = () => <P><circle cx="10" cy="10" r="7.5" /><path d="M10 5.5V10l3 2" /></P>;
export const IconMask = () => <P><path d="M2.5 7.5c2.5-2 12.5-2 15 0 0 4-2.5 7-7.5 7s-7.5-3-7.5-7z" /><circle cx="7" cy="9" r="1.2" /><circle cx="13" cy="9" r="1.2" /></P>;
export const IconLayers = () => <P><path d="M10 3l7.5 4L10 11 2.5 7z" /><path d="M2.5 10.5L10 14.5l7.5-4" /><path d="M2.5 14L10 18l7.5-4" /></P>;
export const IconChart = () => <P><path d="M3 3v14h14" /><path d="M6.5 13V9.5M10 13V6.5M13.5 13v-4.5" /></P>;
export const IconUpload = () => <P><path d="M10 13V3M6 6.5l4-4 4 4" /><path d="M3.5 16.5h13" /></P>;
export const IconWallet = () => <P><rect x="2.5" y="5" width="15" height="11" rx="1.5" /><path d="M2.5 8h15M13 12h1.5" /></P>;
export const IconSend = () => <P><path d="M3 10l14-6.5L12.5 17 10 11z" /><path d="M10 11l7-7.5" /></P>;
