import express, { Request, Response } from "express";
import Category from "../models/Category";

const categoryRouter = express.Router();

interface CategoryRequestBody {
    category: string;
}

// ✅ Create a Category
categoryRouter.post("/new", async (req: Request<{}, {}, CategoryRequestBody>, res: Response) => {
    try {
        const { category } = req.body;
        if (!category || typeof category !== "string") {
            return res.status(400).json({ success: false, error: "Category must be a non-empty string" });
        }

        const newCategory = new Category({ category });
        await newCategory.save();
        res.status(201).json({ success: true, data: newCategory });
    } catch (error) {
        res.status(500).json({ success: false, error: "Error creating category" });
    }
});

// ✅ Get All Categories
categoryRouter.get("/", async (_req: Request, res: Response) => {
    try {
        const categories = await Category.find().select("category -_id");
        res.json({ success: true, data: categories.map((c) => c.category) });
    } catch (error) {
        res.status(500).json({ success: false, error: "Error fetching categories" });
    }
});


// ✅ Update Category (by category name)
categoryRouter.put("/", async (req: Request<{}, {}, { oldCategory: string; newCategory: string }>, res: Response) => {
    try {
        const { oldCategory, newCategory } = req.body;

        if (!oldCategory || !newCategory || typeof oldCategory !== "string" || typeof newCategory !== "string") {
            return res.status(400).json({ success: false, error: "Both oldCategory and newCategory must be non-empty strings" });
        }

        const updatedCategory = await Category.findOneAndUpdate(
            { category: oldCategory },
            { category: newCategory },
            { new: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({ success: false, error: "Category not found" });
        }

        res.json({ success: true, data: updatedCategory });
    } catch (error) {
        res.status(500).json({ success: false, error: "Error updating category" });
    }
});

// ✅ Delete Category (by category name)
categoryRouter.delete("/", async (req: Request<{}, {}, { category: string }>, res: Response) => {
    try {
        const { category } = req.body;

        if (!category || typeof category !== "string") {
            return res.status(400).json({ success: false, error: "Category must be a non-empty string" });
        }

        const deletedCategory = await Category.findOneAndDelete({ category });
        if (!deletedCategory) {
            return res.status(404).json({ success: false, error: "Category not found" });
        }

        res.json({ success: true, data: "Category deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: "Error deleting category" });
    }
});

export default categoryRouter;
