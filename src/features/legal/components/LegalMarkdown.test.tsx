import { render } from "@testing-library/react";

type ReactMarkdownProps = {
  children: React.ReactNode;
  components?: unknown;
  remarkPlugins?: unknown[];
  skipHtml?: boolean;
};

const mockReactMarkdown = jest.fn(({ children }: ReactMarkdownProps) => <>{children}</>);
const mockRemarkGfm = jest.fn();

jest.mock("react-markdown", () => ({
  __esModule: true,
  default: (props: ReactMarkdownProps) => mockReactMarkdown(props),
}));

jest.mock("remark-gfm", () => ({
  __esModule: true,
  default: mockRemarkGfm,
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
        remarkPlugins: [mockRemarkGfm],
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
