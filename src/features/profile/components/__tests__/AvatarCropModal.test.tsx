import { render, screen, fireEvent } from "@testing-library/react";
import { AvatarCropModal, renderCroppedAvatar } from "../AvatarCropModal";

// Mock HTMLCanvasElement getContext
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
    clearRect: jest.fn(),
    save: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    scale: jest.fn(),
    drawImage: jest.fn(),
    restore: jest.fn(),
  });
  HTMLCanvasElement.prototype.toDataURL = jest.fn().mockReturnValue("data:image/jpeg;base64,mockcroppeddata");
});

describe("AvatarCropModal", () => {
  const dummySrc = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  it("renders modal elements correctly when open", () => {
    render(
      <AvatarCropModal
        open={true}
        imageSrc={dummySrc}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />
    );

    expect(screen.getByText("قص وتعديل الصورة الشخصية")).toBeInTheDocument();
    expect(screen.getByText("تدوير ٩٠°-")).toBeInTheDocument();
    expect(screen.getByText("تدوير ٩٠°+")).toBeInTheDocument();
    expect(screen.getByText("انعكاس أفقي")).toBeInTheDocument();
    expect(screen.getByText("انعكاس رأسي")).toBeInTheDocument();
    expect(screen.getByText("إعادة ضبط")).toBeInTheDocument();
    expect(screen.getByText("حفظ واستخدام الصورة")).toBeInTheDocument();
  });

  it("calls onClose when cancel button is clicked", () => {
    const handleClose = jest.fn();
    render(
      <AvatarCropModal
        open={true}
        imageSrc={dummySrc}
        onClose={handleClose}
        onConfirm={jest.fn()}
      />
    );

    fireEvent.click(screen.getByText("إلغاء"));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("helper renderCroppedAvatar returns a base64 image data URL", () => {
    const mockImg = { width: 100, height: 100 } as HTMLImageElement;
    const result = renderCroppedAvatar(mockImg, {
      rotation: 90,
      flipH: true,
      flipV: false,
      zoom: 1.2,
      offsetX: 10,
      offsetY: -5,
      outputSize: 200,
    });

    expect(result).toBe("data:image/jpeg;base64,mockcroppeddata");
  });
});
