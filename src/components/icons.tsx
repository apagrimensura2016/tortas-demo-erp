import type { ReactNode } from "react";

export type IconName =
  | "gauge" | "board" | "calendar" | "users" | "cake" | "boxes" | "register" | "scooter"
  | "shield" | "gear" | "bell" | "plus" | "minus" | "x" | "check" | "clock" | "flame"
  | "arrow" | "search" | "wa" | "copy" | "trash" | "edit" | "chevD" | "chevL" | "chevR"
  | "logout" | "alert" | "scale" | "pin" | "phone" | "note" | "star" | "menu" | "box"
  | "whisk" | "spark" | "ban" | "wallet";

const P: Record<IconName, ReactNode> = {
  gauge: (
    <>
      <path d="M4.5 18.5a8.5 8.5 0 1 1 15 0" />
      <path d="M12 14.5 15.5 11" />
      <circle cx="12" cy="14.5" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  board: (
    <>
      <rect x="3.5" y="4" width="5" height="16" rx="1.2" />
      <rect x="9.8" y="4" width="5" height="11" rx="1.2" />
      <rect x="16" y="4" width="5" height="7.5" rx="1.2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      <path d="M7.5 13.5h3M13.5 13.5h3M7.5 17h3" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19.5c.6-3.4 2.8-5 5.5-5s4.9 1.6 5.5 5" />
      <path d="M15.5 5.9a3.2 3.2 0 0 1 0 5.2M17.5 14.9c1.7.7 2.7 2.2 3 4.6" />
    </>
  ),
  cake: (
    <>
      <path d="M4 20.5h16" />
      <path d="M5 20.5v-5.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5.5" />
      <path d="M5 16.2c1.2 1 2.4.2 3-.6.7.9 2.5 1.2 3.4.1.9 1.1 2.7.8 3.4-.1.6.8 1.8 1.6 3 .6" />
      <path d="M12 13v-2.5" />
      <path d="M12 8.5c-.9-.9.9-1.5 0-2.9" />
    </>
  ),
  boxes: (
    <>
      <path d="M12 3.5 20 7l-8 3.5L4 7z" />
      <path d="M4 7v6l8 3.5 8-3.5V7" />
      <path d="M12 10.5v6" />
      <path d="M4 16.5v3l8 3.5 8-3.5v-3" opacity=".55" />
    </>
  ),
  register: (
    <>
      <path d="M5 9.5 6.5 4h11L19 9.5" />
      <rect x="3.5" y="9.5" width="17" height="10.5" rx="1.5" />
      <path d="M7 13h4M7 16.5h10" />
      <circle cx="16.5" cy="13" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  scooter: (
    <>
      <circle cx="6" cy="17" r="2.8" />
      <circle cx="18.5" cy="17" r="2.8" />
      <path d="M8.8 17h6.2l1.5-6.5h3" />
      <path d="M13 17 11.5 8H8.5" />
      <path d="M8.5 8H6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 19 6v5.2c0 4.6-3 7.8-7 9.3-4-1.5-7-4.7-7-9.3V6z" />
      <path d="m9 11.5 2.2 2.2L15.5 9" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 4.5v-2M12 21.5v-2M4.5 12h-2M21.5 12h-2M6.7 6.7 5.3 5.3M18.7 18.7l-1.4-1.4M6.7 17.3l-1.4 1.4M18.7 5.3l-1.4 1.4" />
    </>
  ),
  bell: (
    <>
      <path d="M12 4a5.5 5.5 0 0 1 5.5 5.5c0 4 1.5 5.4 2 6H4.5c.5-.6 2-2 2-6A5.5 5.5 0 0 1 12 4Z" />
      <path d="M10 18.8a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  x: <path d="m6 6 12 12M18 6 6 18" />,
  check: <path d="m4.5 12.5 5 5L19.5 7" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.2l3.4 2" />
    </>
  ),
  flame: <path d="M12 3.5c.6 3-1.4 4.4-2.7 6A6.7 6.7 0 0 0 7.5 14a4.9 4.9 0 0 0 9.8.2c.9-3.6-1.8-5-1.4-8.2-2 .8-2.4 2.6-2.2 4.3-1.5-.9-2-2.6-1.7-6.8Z" />,
  arrow: <path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  wa: (
    <>
      <path d="M12 3.8a8.2 8.2 0 0 0-7 12.4L4 20l3.9-1a8.2 8.2 0 1 0 4.1-15.2Z" />
      <path d="M9 9.2c-.5 1.9 2 5.2 4.3 5.6.9.2 1.9-.3 1.9-1.2 0-.6-1.2-1.2-1.8-1-.5.2-.6.8-1.2.6A4.6 4.6 0 0 1 10 11c-.2-.6.4-.7.6-1.2.2-.6-.5-1.7-1.6-.6Z" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
      <path d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" transform="translate(0,0)" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 6.5h15M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" />
      <path d="M6.5 6.5 7.4 19a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5l.9-12.5" />
      <path d="M10 10.5v6M14 10.5v6" />
    </>
  ),
  edit: (
    <>
      <path d="M14.5 5.5 18.5 9.5 8 20H4v-4z" />
      <path d="m12.5 7.5 4 4" />
    </>
  ),
  chevD: <path d="m6 9.5 6 6 6-6" />,
  chevL: <path d="M14.5 6 8.5 12l6 6" />,
  chevR: <path d="m9.5 6 6 6-6 6" />,
  logout: (
    <>
      <path d="M14 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7" />
      <path d="M17 8.5 20.5 12 17 15.5M20.5 12H10" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4 2.8 19.5h18.4Z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="16.7" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  scale: (
    <>
      <path d="M12 4v16M7 20h10" />
      <path d="M5 7h14" />
      <path d="M5 7 3 12a2.6 2.6 0 0 0 5 0zM19 7l-2 5a2.6 2.6 0 0 0 5 0z" transform="translate(-0.5,0)" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.4-6.5-10.3a6.5 6.5 0 0 1 13 0C18.5 15.6 12 21 12 21Z" />
      <circle cx="12" cy="10.5" r="2.3" />
    </>
  ),
  phone: <path d="M5.5 4h3l1.5 4-2 1.5a12 12 0 0 0 6.5 6.5L16 14l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3.5 6.2 2 2 0 0 1 5.5 4Z" />,
  note: (
    <>
      <path d="M5 4.5h14v12l-3.5 3.5H5Z" />
      <path d="M15.5 20v-3.5H19M8.5 9h7M8.5 12.5h5" />
    </>
  ),
  star: <path d="m12 4 2.3 5 5.2.6-3.9 3.6 1.1 5.2L12 15.8l-4.7 2.6 1.1-5.2L4.5 9.6 9.7 9Z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  box: (
    <>
      <path d="m12 3 8 3.5v11L12 21l-8-3.5v-11Z" />
      <path d="M4 6.5 12 10l8-3.5M12 10v11" />
    </>
  ),
  whisk: (
    <>
      <path d="m14 10 6.5-6.5" />
      <path d="M4.5 13.5c-1.3 2.6.5 5.6 3.2 5.9 2.5.3 4.6-1.2 5.6-3.4 1-2.3.4-5-1.6-6.2-2.1-1.2-5.9.9-7.2 3.7Z" />
      <path d="M6.5 12c2.7-.6 5.4.4 6.8 2.7M5 15c2-.3 4.6.2 6.3 1.7" />
    </>
  ),
  spark: <path d="M12 3v4.5M12 16.5V21M3 12h4.5M16.5 12H21M6 6l2.8 2.8M15.2 15.2 18 18M18 6l-2.8 2.8M8.8 15.2 6 18" />,
  ban: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6 6l12 12" />
    </>
  ),
  wallet: (
    <>
      <rect x="3.5" y="6" width="17" height="13.5" rx="2" />
      <path d="M3.5 9.5h17" opacity=".5" />
      <path d="M16 14.5h2.5" />
    </>
  ),
};

export function I({ n, className = "w-5 h-5" }: { n: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {P[n]}
    </svg>
  );
}
