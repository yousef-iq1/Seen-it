type IconProps = {
    size?: number;
    className?: string;
    strokeWidth?: number;
};
function base(props: IconProps) {
    return {
        width: props.size ?? 20,
        height: props.size ?? 20,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: props.strokeWidth ?? 2,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
        className: props.className,
        "aria-hidden": true,
    };
}
export const CardsIcon = (p: IconProps) => (<svg {...base(p)}>
    <rect x="6.5" y="3.5" width="12" height="17" rx="2.5" transform="rotate(6 12.5 12)"/>
    <rect x="4" y="4.5" width="12" height="17" rx="2.5" transform="rotate(-6 10 13)"/>
  </svg>);
export const GridIcon = (p: IconProps) => (<svg {...base(p)}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/>
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/>
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/>
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>
  </svg>);
export const SparklesIcon = (p: IconProps) => (<svg {...base(p)}>
    <path d="M12 4l1.7 4.3L18 10l-4.3 1.7L12 16l-1.7-4.3L6 10l4.3-1.7L12 4z"/>
    <path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z"/>
  </svg>);
export const BooksIcon = (p: IconProps) => (<svg {...base(p)}>
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20V4H6.5A2.5 2.5 0 004 6.5v13z"/>
    <path d="M4 19.5A2.5 2.5 0 006.5 22H20v-5"/>
  </svg>);
export const FilmIcon = (p: IconProps) => (<svg {...base(p)}>
    <rect x="3" y="4" width="18" height="16" rx="2.5"/>
    <path d="M8 4v16M16 4v16M3 9h5M3 15h5M16 9h5M16 15h5"/>
  </svg>);
export const HeartIcon = (p: IconProps & {
    filled?: boolean;
}) => (<svg {...base(p)} fill={p.filled ? "currentColor" : "none"}>
    <path d="M12 20.5s-7-4.6-9-8.6C1.5 8.7 3.3 5.5 6.4 5.5c2 0 3.1 1 3.9 2.2L12 9.5l1.7-1.8c.8-1.2 1.9-2.2 3.9-2.2 3.1 0 4.9 3.2 3.4 6.4-2 4-9 8.6-9 8.6z"/>
  </svg>);
export const XIcon = (p: IconProps) => (<svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18"/>
  </svg>);
export const ArrowUpIcon = (p: IconProps) => (<svg {...base(p)}>
    <path d="M12 19V5M5 12l7-7 7 7"/>
  </svg>);
export const UndoIcon = (p: IconProps) => (<svg {...base(p)}>
    <path d="M9 14L4 9l5-5"/>
    <path d="M4 9h10a6 6 0 016 6v1"/>
  </svg>);
export const SearchIcon = (p: IconProps) => (<svg {...base(p)}>
    <circle cx="11" cy="11" r="7"/>
    <path d="M21 21l-4.3-4.3"/>
  </svg>);
export const StarIcon = (p: IconProps & {
    filled?: boolean;
}) => (<svg {...base(p)} fill={p.filled ? "currentColor" : "none"}>
    <path d="M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6-5.4-2.9L6.6 19.7l1.1-6L3.2 9.4l6.1-.8L12 3z"/>
  </svg>);
export const ClapperIcon = (p: IconProps) => (<svg {...base(p)}>
    <rect x="3" y="8" width="18" height="12" rx="2"/>
    <path d="M3 8l1.5-4L21 6l-1 2.5"/>
    <path d="M8.5 4.8L7 8.5M13.5 5.4L12 9M18.5 6L17 9"/>
  </svg>);
export const TvIcon = (p: IconProps) => (<svg {...base(p)}>
    <rect x="3" y="6" width="18" height="13" rx="2"/>
    <path d="M8 2.5L12 6l4-3.5"/>
  </svg>);
export const InfoIcon = (p: IconProps) => (<svg {...base(p)}>
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 11v5"/>
    <circle cx="12" cy="8" r="0.5" fill="currentColor"/>
  </svg>);
export const PlusIcon = (p: IconProps) => (<svg {...base(p)}>
    <path d="M12 5v14M5 12h14"/>
  </svg>);
export const ShareIcon = (p: IconProps) => (<svg {...base(p)}>
    <circle cx="6" cy="12" r="2.5"/>
    <circle cx="17" cy="5.5" r="2.5"/>
    <circle cx="17" cy="18.5" r="2.5"/>
    <path d="M8.3 10.8l6.4-4M8.3 13.2l6.4 4"/>
  </svg>);
export const GlobeIcon = (p: IconProps) => (<svg {...base(p)}>
    <circle cx="12" cy="12" r="9"/>
    <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z"/>
  </svg>);
export const PopcornIcon = (p: IconProps) => (<svg {...base(p)}>
    <path d="M6 10l1.5 10.5h9L18 10"/>
    <path d="M5 10h14"/>
    <path d="M7.5 6.5a2.4 2.4 0 013-2.2 2.6 2.6 0 015 0 2.4 2.4 0 013 2.2 1.9 1.9 0 01-.5 3.5H8a1.9 1.9 0 01-.5-3.5z"/>
    <path d="M10 10l.7 10.5M14 10l-.7 10.5"/>
  </svg>);
export const ThumbsDownIcon = (p: IconProps & {
    filled?: boolean;
}) => (<svg {...base(p)} fill={p.filled ? "currentColor" : "none"}>
    
    <path d="M14.6 4H7.3c-1 0-1.9.6-2.2 1.6l-1.9 5.7c-.5 1.5.6 3 2.2 3h3.2c.4 0 .7.4.6.8l-.6 2.8c-.3 1.3.6 2.6 2 2.7.6 0 1.2-.3 1.5-.9l2.5-4.9c.1-.3.2-.6.2-.9V5.4c0-.8-.6-1.4-1.2-1.4z"/>
    
    <path d="M19 4.2h.4c.9 0 1.6.7 1.6 1.6v6.4c0 .9-.7 1.6-1.6 1.6H19c-.9 0-1.6-.7-1.6-1.6V5.8c0-.9.7-1.6 1.6-1.6z"/>
  </svg>);
export const LoginIcon = (p: IconProps) => (<svg {...base(p)}>
    <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
    <path d="M10 17l5-5-5-5M15 12H3"/>
  </svg>);
export const EyeIcon = (p: IconProps) => (<svg {...base(p)}>
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/>
    <circle cx="12" cy="12" r="2.6"/>
  </svg>);
export const ChevronDownIcon = (p: IconProps) => (<svg {...base(p)}>
    <path d="m6 9 6 6 6-6"/>
  </svg>);
export const GoogleIcon = ({ size = 20, className }: {
    size?: number;
    className?: string;
}) => (<svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.5 17.7 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.2-.4-4.6H24v9.1h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.6 5.9c4.4-4.1 6.7-10.1 6.7-17.3z"/>
    <path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.6 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z"/>
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.7-4-13.6-9.6l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/>
  </svg>);
export const UserIcon = (p: IconProps) => (<svg {...base(p)}>
    <circle cx="12" cy="8" r="3.6"/>
    <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0"/>
  </svg>);
export const TrashIcon = (p: IconProps) => (<svg {...base(p)}>
    <path d="M4 7h16"/>
    <path d="M9.5 7V5.4A1.4 1.4 0 0 1 10.9 4h2.2a1.4 1.4 0 0 1 1.4 1.4V7"/>
    <path d="M6.4 7l.8 11.3A1.8 1.8 0 0 0 9 20h6a1.8 1.8 0 0 0 1.8-1.7L17.6 7"/>
    <path d="M10.5 11v5M13.5 11v5"/>
  </svg>);
export const CheckIcon = (p: IconProps) => (<svg {...base(p)}>
    <path d="m4.5 12.5 5 5 10-11"/>
  </svg>);
export const LinkIcon = (p: IconProps) => (<svg {...base(p)}>
    <path d="M10.5 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7l-1.4 1.4"/>
    <path d="M13.5 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1.4-1.4"/>
  </svg>);
export const UsersIcon = (p: IconProps) => (<svg {...base(p)}>
    <circle cx="9" cy="8" r="3.2"/>
    <path d="M3 20a6 6 0 0 1 12 0"/>
    <path d="M16.2 5.3a3.2 3.2 0 0 1 0 5.6"/>
    <path d="M17.6 14.4A6 6 0 0 1 21 20"/>
  </svg>);
export const SlidersIcon = (p: IconProps) => (<svg {...base(p)}>
    <path d="M5 4v6M5 14v6M12 4v3M12 11v9M19 4v10M19 18v2"/>
    <circle cx="5" cy="12" r="2"/>
    <circle cx="12" cy="9" r="2"/>
    <circle cx="19" cy="16" r="2"/>
  </svg>);
export const ChevronLeftIcon = (p: IconProps) => (<svg {...base(p)}>
    <path d="M14.5 5.5 8 12l6.5 6.5"/>
  </svg>);
export const ChevronRightIcon = (p: IconProps) => (<svg {...base(p)}>
    <path d="M9.5 5.5 16 12l-6.5 6.5"/>
  </svg>);
export const StackIcon = (p: IconProps) => (<svg {...base(p)}>
    <path d="M12 3 3 7.5l9 4.5 9-4.5L12 3Z"/>
    <path d="M3 12.4 12 17l9-4.6"/>
    <path d="M3 16.9 12 21.5l9-4.6"/>
  </svg>);
export const ShuffleIcon = (p: IconProps) => (<svg {...base(p)}>
    <path d="M3 7h3.6a4 4 0 0 1 3.3 1.8l4.2 6.4A4 4 0 0 0 17.4 17H21"/>
    <path d="M3 17h3.6a4 4 0 0 0 3.3-1.8l.7-1.1"/>
    <path d="M13.9 9 14.6 8A4 4 0 0 1 17.9 6H21"/>
    <path d="m18.2 3.4 3 2.6-3 2.6M18.2 14.4l3 2.6-3 2.6"/>
  </svg>);
export const ShieldIcon = (p: IconProps) => (<svg {...base(p)}>
    <path d="M12 3.2 5 6v5.6c0 4.2 2.9 7.6 7 9.2 4.1-1.6 7-5 7-9.2V6l-7-2.8Z"/>
  </svg>);
