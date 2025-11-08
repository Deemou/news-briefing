export type SummarizeUrlRequest = {
  mode: "url";
  url: string;
};

export type SummarizeTextRequest = {
  mode: "text";
  url: string;
  text: string;
  title?: string;
  site?: string;
};

export type SummarizeRequest = SummarizeUrlRequest | SummarizeTextRequest;
