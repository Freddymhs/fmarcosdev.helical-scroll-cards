import * as react_jsx_runtime from 'react/jsx-runtime';

interface CardItem {
    id: number | string;
    title?: string;
    subtitle?: string;
    date?: string;
    Title?: string;
    publishedAt?: string;
}
interface HelixTheme {
    gradientStart: string;
    gradientMid: string;
    gradientEnd: string;
    border: string;
    headerBg: string;
    headerText: string;
    titleText: string;
    dateBg: string;
    dateText: string;
    dateSubtext: string;
    footerBg: string;
    footerText: string;
    helixLine: number;
}
interface CardConfig {
    canvasWidth?: number;
    canvasHeight?: number;
    titleMaxLength?: number;
}
interface HelixConfig {
    slotCount?: number;
    turns?: number;
    helixHeight?: number;
    cardScale?: number;
    yOffset?: number;
    cameraFov?: number;
    topMarginSlots?: number;
    cardConfig?: CardConfig;
}
interface HelicalScrollCardsProps<T extends CardItem = CardItem> {
    items?: T[];
    config?: HelixConfig;
    debug?: boolean;
    hiddenReposition?: boolean;
    clockwise?: boolean;
    scrollSpeed?: number;
    onLoadMore?: () => void;
    hasMore?: boolean;
    loadingMore?: boolean;
    theme?: Partial<HelixTheme>;
    renderCardLabel?: (item: T, index: number) => string;
    renderCardTitle?: (item: T) => string;
    renderCardDate?: (item: T) => {
        day: string;
        month: string;
        year: string;
    } | null;
    loadingText?: string;
    emptyText?: string;
    className?: string;
}
declare const HelicalScrollCards: <T extends CardItem = CardItem>({ items, config, debug, hiddenReposition, clockwise, scrollSpeed, onLoadMore, hasMore, loadingMore, theme: customTheme, renderCardLabel, renderCardTitle, renderCardDate, loadingText, emptyText, className, }: HelicalScrollCardsProps<T>) => react_jsx_runtime.JSX.Element;

export { type CardConfig, type CardItem, HelicalScrollCards, type HelicalScrollCardsProps, type HelixConfig, type HelixTheme };
