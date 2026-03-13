declare module 'jsbarcode' {
    function JsBarcode(
        element: SVGSVGElement | HTMLCanvasElement | HTMLImageElement | string,
        data: string,
        options?: {
            format?: string;
            width?: number;
            height?: number;
            displayValue?: boolean;
            fontSize?: number;
            font?: string;
            textMargin?: number;
            margin?: number;
            background?: string;
            lineColor?: string;
            textAlign?: string;
            textPosition?: string;
            valid?: (valid: boolean) => void;
        }
    ): void;
    export default JsBarcode;
}
