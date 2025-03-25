import express, { Request, Response } from "express"
import MediaModel from "../models/Media";
const mediaRouter = express.Router()
const cloudinary = require("cloudinary").v2;
import "dotenv/config"
import { getSecureImage } from "../helpers/getSecureImage";

// 🔹 Configure Cloudinary (Replace with your credentials)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


mediaRouter.post("/new", async (req: Request, res: Response) => {
    try {
        // const requiredFields = [
        //     "name",
        //     "subscribers",
        //     "author",
        //     "category",
        //     "language",
        //     "longDescription",
        //     "shortDescription",
        //     "mediaType",
        // ];

        // // Check for missing fields
        // const missingFields = requiredFields.filter((field) => !req.body[field]);
        // if (missingFields.length > 0) {
        //     return res.status(400).json({
        //         error: `Missing required fields: ${missingFields.join(", ")}`,
        //     });
        // }

        let mediaType = req.body.type

        mediaType = (mediaType == "group" || mediaType == "supergroup") ? "group" : mediaType?.toLowerCase()
        let imageUrl = req.body.imageUrl
        if (imageUrl) {
            imageUrl = await getSecureImage(imageUrl)
        }

        // Manually set the date
        const mediaData = {
            ...req.body,
            imageUrl,
            date: new Date().toISOString(), // Store as ISO string
            mediaType,
            author: "test@user.mail"
        };

        // Create new document
        const newMedia = new MediaModel(mediaData);
        await newMedia.save();

        res.status(201).json({ success: true, message: "Media created successfully", });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
        console.log(error);
    }
});

mediaRouter.put("/:id", async (req: Request, res: Response) => {
    try {
        const fields = req.body;
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ success: false, error: "Id is required" });
        }

        const media = await MediaModel.findById(id);
        if (!media) {
            return res.status(404).json({ success: false, error: "Media not found" });
        }

        // Update fields dynamically
        Object.assign(media, fields);
        await media.save();

        res.status(200).json({ success: true, message: "Media updated successfully", data: media });
    } catch (error) {
        res.status(500).json({ succes: false, error });
    }
});

mediaRouter.delete("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: "Id is required" });
        }

        // 🔍 Find media entry
        const media = await MediaModel.findById(id);

        if (!media) {
            return res.status(404).json({ error: "Media not found" });
        }

        // 🔥 Extract Cloudinary public ID from image URL
        const imageUrl = media?.imageUrl;

        if (imageUrl) {
            const publicId = imageUrl.split('/').pop()?.split('.')[0]; // Extract public ID
            if (publicId) {
                try {
                    await cloudinary.uploader.destroy("telegam_images/" + publicId);
                } catch (error) {
                    console.log("Error deleting img:\n", error)
                }

            }
        }


        // ❌ Delete media from MongoDB
        await MediaModel.findByIdAndDelete(id);

        res.status(200).json({ message: "Media and image deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Internal server error", details: error });
    }
});

mediaRouter.post("/delete-many", async (req: Request, res: Response) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: "An array of IDs is required" });
        }

        // 🔍 Find media entries
        const mediaItems = await MediaModel.find({ _id: { $in: ids } });

        if (mediaItems.length === 0) {
            return res.status(404).json({ error: "No media found for the given IDs" });
        }

        // 🔥 Extract Cloudinary public IDs from URLs
        const publicIds = mediaItems
            .map((media) => {
                const imageUrl = media?.imageUrl;
                if (!imageUrl) return null; // Handle cases where imageUrl is undefined or null
                return imageUrl.split('/').pop()?.split('.')[0]; // Extract public ID
            })
            .filter((id): id is string => id !== null); // Remove null values and ensure correct type

        // 🚀 Delete images from Cloudinary
        await cloudinary.api.delete_resources("telegam_images/" + publicIds);

        // ❌ Delete media records from MongoDB
        await MediaModel.deleteMany({ _id: { $in: ids } });

        res.status(200).json({ message: `${mediaItems.length} media items and images deleted successfully` });
    } catch (error) {
        res.status(500).json({ error: "Internal server error", details: error });
    }
});

mediaRouter.post("/update-many", async (req: Request, res: Response) => {
    try {
        const updates = req.body;

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ error: "An array of updates is required" });
        }

        const bulkOperations = updates.map(({ id, ...fields }) => ({
            updateOne: {
                filter: { _id: id },
                update: { $set: fields }
            }
        }));

        const result = await MediaModel.bulkWrite(bulkOperations);

        if (result.modifiedCount === 0) {
            return res.status(404).json({ error: "No media items were updated" });
        }

        res.status(200).json({ message: `${result.modifiedCount} media items updated successfully` });
    } catch (error) {
        res.status(500).json({ error: "Internal server error", details: error });
    }
});

mediaRouter.get("/pending/:mediaType", async (req: Request, res: Response) => {
    try {
        const { mediaType } = req.params;

        // Define base filter
        const filter: Record<string, any> = {
            status: { $ne: "Approved" }
        };


        // Check if `mediaType` is provided and is not empty/null
        if (mediaType && mediaType !== "undefined" && mediaType.trim() !== "") {
            filter.mediaType = mediaType;
        }

        // Fetch media based on the filter
        const mediaList = await MediaModel.find(filter, {
            memberCount: 1,
            imageUrl: 1,
            date: 1,
            author: 1,
            name: 1,
            status: 1,
            description: 1
        });

        const formattedMediaList = mediaList.map(media => ({
            _id: media._id,
            photo: media.imageUrl,
            date: media.date,
            author: media.author,
            name: media.name,
            status: media.status,
            description: media.description, // Mapping shortDescription to description
            memberCount: media.memberCount
        }));

        res.status(200).json({ success: true, data: formattedMediaList });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
        console.error(error);
    }
});

mediaRouter.get("/approved", async (req: Request, res: Response) => {
    try {
        // Define filter to fetch only "Approved" media
        const filter = { status: "Approved" };

        // Fetch media based on the filter
        const mediaList = await MediaModel.find(filter);

        res.status(200).json({ success: true, data: mediaList });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

mediaRouter.get("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params

        if (!id) {
            return res.status(400).json({ success: false, error: "Media id is required." })
        }

        // Fetch media based on the id
        const mediaItem = await MediaModel.findById(id);

        if (!mediaItem) {
            return res.status(404).json({ success: false, error: "Media not found." })
        }


        res.status(200).json({ success: true, data: mediaItem });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

mediaRouter.post("/you-may-like/:mediaType", async (req: Request, res: Response) => {
    try {
        const { mediaType } = req.params
        const { exclude } = req.body

        if (!mediaType) {
            return res.status(400).json({ success: false, error: "Media type is required." })
        }

        if (!exclude) {
            return res.status(400).json({ success: false, error: "Please provide the media id of the current page." })
        }

        const excludedItemExists = await MediaModel.findById(exclude)
        if (!excludedItemExists) {
            return res.status(400).json({ success: false, error: "Excluded item does not exist." })
        }

        // Fetch media based on mediaType while excluding a specific ID
        const mediaItems = await MediaModel.find({
            mediaType,
            _id: { $ne: exclude }, // Exclude the given ID
        }).limit(8);

        if (!mediaItems) {
            return res.status(404).json({ success: false, error: "No media." })
        }


        res.status(200).json({ success: true, data: mediaItems });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


export default mediaRouter