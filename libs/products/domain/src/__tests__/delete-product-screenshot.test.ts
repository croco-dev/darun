import { describe, expect, it, vi } from "vitest";
import { DeleteProductScreenshot } from "../usecases/DeleteProductScreenshot";
import { ProductScreenshot } from "../entities/ProductScreenshot";
import { productScreenshotNotFound } from "../errors/productError";

describe("DeleteProductScreenshot", () => {
  it("should delete screenshot and image when screenshot exists", async () => {
    const mockScreenshot = new ProductScreenshot({
      id: "screenshot-1",
      productId: "product-1",
      imageUrl:
        "https://res.cloudinary.com/test/image/upload/v1/folder/image.png",
      imageAlt: "Test image",
    });

    const mockRepository = {
      findById: vi.fn().mockResolvedValue(mockScreenshot),
      deleteById: vi.fn().mockResolvedValue(undefined),
      findManyByProductIdSortByPriorityDesc: vi.fn(),
      insert: vi.fn(),
    };

    const mockImageDeleter = {
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const useCase = new DeleteProductScreenshot(
      mockRepository,
      mockImageDeleter,
    );

    await useCase.execute("screenshot-1");

    expect(mockRepository.findById).toHaveBeenCalledWith("screenshot-1");
    expect(mockRepository.deleteById).toHaveBeenCalledWith("screenshot-1");
    expect(mockImageDeleter.delete).toHaveBeenCalledWith(
      mockScreenshot.imageUrl,
    );
  });

  it("should throw error when screenshot not found", async () => {
    const mockRepository = {
      findById: vi.fn().mockResolvedValue(null),
      deleteById: vi.fn(),
      findManyByProductIdSortByPriorityDesc: vi.fn(),
      insert: vi.fn(),
    };

    const mockImageDeleter = {
      delete: vi.fn(),
    };

    const useCase = new DeleteProductScreenshot(
      mockRepository,
      mockImageDeleter,
    );

    await expect(useCase.execute("screenshot-1")).rejects.toThrow(
      productScreenshotNotFound(),
    );

    expect(mockRepository.findById).toHaveBeenCalledWith("screenshot-1");
    expect(mockRepository.deleteById).not.toHaveBeenCalled();
    expect(mockImageDeleter.delete).not.toHaveBeenCalled();
  });

  it("should not delete screenshot when image deletion fails (non-not-found)", async () => {
    const mockScreenshot = new ProductScreenshot({
      id: "screenshot-1",
      productId: "product-1",
      imageUrl:
        "https://res.cloudinary.com/test/image/upload/v1/folder/image.png",
      imageAlt: "Test image",
    });

    const mockRepository = {
      findById: vi.fn().mockResolvedValue(mockScreenshot),
      deleteById: vi.fn().mockResolvedValue(undefined),
      findManyByProductIdSortByPriorityDesc: vi.fn(),
      insert: vi.fn(),
    };

    const mockImageDeleter = {
      delete: vi.fn().mockRejectedValue(new Error("Cloudinary error")),
    };

    const useCase = new DeleteProductScreenshot(
      mockRepository,
      mockImageDeleter,
    );

    await expect(useCase.execute("screenshot-1")).rejects.toThrow(
      "Cloudinary error",
    );

    expect(mockRepository.findById).toHaveBeenCalledWith("screenshot-1");
    expect(mockRepository.deleteById).not.toHaveBeenCalled();
    expect(mockImageDeleter.delete).toHaveBeenCalledWith(
      mockScreenshot.imageUrl,
    );
  });

  it("should delete screenshot when remote image is already not found", async () => {
    const mockScreenshot = new ProductScreenshot({
      id: "screenshot-1",
      productId: "product-1",
      imageUrl:
        "https://res.cloudinary.com/test/image/upload/v1/folder/image.png",
      imageAlt: "Test image",
    });

    const mockRepository = {
      findById: vi.fn().mockResolvedValue(mockScreenshot),
      deleteById: vi.fn().mockResolvedValue(undefined),
      findManyByProductIdSortByPriorityDesc: vi.fn(),
      insert: vi.fn(),
    };

    const mockImageDeleter = {
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const useCase = new DeleteProductScreenshot(
      mockRepository,
      mockImageDeleter,
    );

    await useCase.execute("screenshot-1");

    expect(mockRepository.findById).toHaveBeenCalledWith("screenshot-1");
    expect(mockRepository.deleteById).toHaveBeenCalledWith("screenshot-1");
    expect(mockImageDeleter.delete).toHaveBeenCalledWith(
      mockScreenshot.imageUrl,
    );
  });
});
