import { getCollapsedMessageText } from "../ExpandableMessageText";

describe("getCollapsedMessageText", () => {
  it("keeps short messages unchanged", () => {
    expect(getCollapsedMessageText("short message", 20)).toBe("short message");
  });

  it("collapses at a nearby word boundary", () => {
    expect(getCollapsedMessageText("one two three four five", 15)).toBe("one two three...");
  });

  it("still collapses a long unbroken token", () => {
    expect(getCollapsedMessageText("abcdefghijklmnop", 10)).toBe("abcdefghij...");
  });
});
