import { render } from "@testing-library/react";

type ReactMarkdownProps = {
  children: React.ReactNode;
  components?: unknown;
  remarkPlugins?: unknown[];
  skipHtml?: boolean;
};

const mockReactMarkdown = jest.fn(({ children }: ReactMarkdownProps) => <>{children}</>);

jest.mock("react-markdown", () => ({
  __esModule: true,
  default: (props: ReactMarkdownProps) => mockReactMarkdown(props),
}));

jest.mock("remark-gfm", () => ({
  __esModule: true,
  default: jest.fn(),
}));

import { LegalMarkdown } from "./LegalMarkdown";

describe("LegalMarkdown", () => {
  beforeEach(() => {
    mockReactMarkdown.mockClear();
  });

  it("configures GFM rendering and custom presentation components", () => {
    const content = "**مدة الإخطار**";
    render(<LegalMarkdown content={content} />);

    expect(mockReactMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        children: content,
        remarkPlugins: [expect.any(Function)],
        skipHtml: true,
      }),
    );

    const [{ components }] = mockReactMarkdown.mock.calls[0];
    expect(components).toEqual(
      expect.objectContaining({
        strong: expect.any(Function),
        ul: expect.any(Function),
        table: expect.any(Function),
      }),
    );
  });

  it("disables raw HTML in model output", () => {
    const { container } = render(
      <LegalMarkdown content={'نص آمن <script>alert("xss")</script>'} />,
    );

    expect(mockReactMarkdown).toHaveBeenLastCalledWith(
      expect.objectContaining({ skipHtml: true }),
    );
    expect(container.querySelector("script")).toBeNull();
  });
});
