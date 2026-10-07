type Render = React.ReactElement | ((props: object) => React.ReactElement)

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "left" | "right"
  variant?: "sidebar" | "floating" | "inset"
  /** `none` renders a static panel (use it inside layouts and cards). */
  collapsible?: "offcanvas" | "icon" | "none"
}
export declare function Sidebar(props: SidebarProps): React.ReactElement

export interface SidebarProviderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Default true. */
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}
export declare function SidebarProvider(
  props: SidebarProviderProps
): React.ReactElement
export declare function useSidebar(): {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

export declare function SidebarTrigger(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
): React.ReactElement
export declare function SidebarRail(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
): React.ReactElement
export declare function SidebarInset(
  props: React.HTMLAttributes<HTMLElement>
): React.ReactElement
export declare function SidebarInput(
  props: React.InputHTMLAttributes<HTMLInputElement>
): React.ReactElement
export declare function SidebarHeader(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function SidebarFooter(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function SidebarSeparator(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function SidebarContent(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function SidebarGroup(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function SidebarGroupLabel(
  props: React.HTMLAttributes<HTMLDivElement> & { render?: Render }
): React.ReactElement
export declare function SidebarGroupAction(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { render?: Render }
): React.ReactElement
export declare function SidebarGroupContent(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function SidebarMenu(
  props: React.HTMLAttributes<HTMLUListElement>
): React.ReactElement
export declare function SidebarMenuItem(
  props: React.LiHTMLAttributes<HTMLLIElement>
): React.ReactElement
export declare function SidebarMenuButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    render?: Render
    isActive?: boolean
    /** Shown only when the sidebar is collapsed to icons. */
    tooltip?: string | object
    variant?: "default" | "outline"
    /** default 36px, sm 32px, lg 56px. */
    size?: "default" | "sm" | "lg"
  }
): React.ReactElement
export declare function SidebarMenuAction(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    render?: Render
    showOnHover?: boolean
  }
): React.ReactElement
export declare function SidebarMenuBadge(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function SidebarMenuSkeleton(
  props: React.HTMLAttributes<HTMLDivElement> & { showIcon?: boolean }
): React.ReactElement
export declare function SidebarMenuSub(
  props: React.HTMLAttributes<HTMLUListElement>
): React.ReactElement
export declare function SidebarMenuSubItem(
  props: React.LiHTMLAttributes<HTMLLIElement>
): React.ReactElement
export declare function SidebarMenuSubButton(
  props: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    render?: Render
    size?: "sm" | "md"
    isActive?: boolean
  }
): React.ReactElement
