/** OCR implementations can supply the same page-text contract; none is enabled by default. */
export interface ExtractedPageText { text: string }
export interface TextExtractionDocument { totalPages: number; page(number: number): Promise<ExtractedPageText>; close(): Promise<void> }
export interface TextExtractionProvider { id: string; kind: 'text' | 'ocr'; open(blob: Blob): Promise<TextExtractionDocument> }
