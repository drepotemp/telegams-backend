import axios from "axios";
import "dotenv/config"
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
import { Request, Response } from "express";
import { getSecureImage } from "../helpers/getSecureImage";

export const fetchMedia = async (req: Request, res: Response, bot: any, token: string) => {
    try {

        const { url } = req.body;

        let memberCount = 0;

        if (!url || typeof url !== 'string') {
            return res.status(400).json({ error: "URL parameter is required and must be a string" });
        }
        // console.log('url: ' + url);
        // Normalize URL by removing any leading @
        const normalizedUrl = url.startsWith('@') ? url.substring(1) : url;

        // Extract username from URL and handle different URL formats
        let username = normalizedUrl.split('/').pop();
        let isSticker = false;
        let isBot = false;

        // Handle sticker URLs (e.g., https://t.me/addstickers/packname)
        if (normalizedUrl.includes('/addstickers/')) {
            username = normalizedUrl.split('/addstickers/')[1];
            isSticker = true;
        }
        // Handle bot URLs
        else if (
            // Case 1: Last part of URL ends with "bot" (case insensitive)
            (normalizedUrl.split('/').pop()?.toLowerCase().endsWith('bot')) ||
            // Case 2: Username format with _bot
            (normalizedUrl.startsWith('@') && normalizedUrl.toLowerCase().endsWith('bot'))
        ) {
            // Extract username, removing @ and parameters
            username = (normalizedUrl.split('/').pop() || normalizedUrl.substring(1)).split('?')[0];
            isBot = true;
        }
        // Handle regular channel/group URLs
        else {
            username = normalizedUrl.split('/').pop();
        }

        // console.log('username: ' + username);

        if (!username) {
            return res.status(400).json({ error: "Invalid Telegram URL" });
        }

        // Get entity information based on type
        let chat;
        let stickerSet = null;
        let imageUrl = null;

        if (isSticker) {
            try {
                stickerSet = await bot.getStickerSet(username);
                // console.log(stickerSet)
                chat = {
                    type: 'sticker',
                    title: stickerSet.title,
                    description: '',
                    photo: null
                };
                // Get the first sticker as the image
                if (stickerSet.stickers.length > 0) {
                    const firstSticker = stickerSet.stickers[0];
                    const file = await bot.getFile(firstSticker.file_id);
                    imageUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
                }
            } catch (err: any) {
                console.log('Failed to get sticker set:', err.message);
                throw new Error('Failed to fetch sticker pack');
            }
        } else {
            try {
                // For bot URLs, fetch the target bot's information
                if (isBot) {
                    try {
                        // Get the target bot's information using getChat
                        const targetBot = await bot.getChat('@' + username);
                        // console.log(targetBot)
                        chat = {
                            type: 'bot',
                            title: targetBot.first_name + (targetBot.last_name ? ' ' + targetBot.last_name : ''),
                            description: targetBot.username || '',
                            photo: targetBot.photo || null
                        };

                        // Try to get the bot's profile photo
                        if (targetBot.photo?.big_file_id) {
                            try {
                                const file = await bot.getFile(targetBot.photo.big_file_id);
                                if (file && file.file_path) {
                                    imageUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
                                    // console.log('Successfully fetched bot profile photo:', imageUrl);
                                } else {
                                    // console.log('File object is missing file_path:', file);
                                }
                            } catch (err) {
                                console.error('Error fetching bot profile photo:', err);
                                imageUrl = null;
                            }
                        } else {
                            console.log('Bot has no profile photo set in photo.big_file_id');
                        }

                        // If imageUrl is still null, try getUserProfilePhotos
                        if (!imageUrl) {
                            try {
                                // console.log('Attempting to fetch profile photos via getUserProfilePhotos');
                                const profilePhotos = await bot.getUserProfilePhotos(targetBot.id, {
                                    offset: 0,
                                    limit: 1
                                });

                                if (profilePhotos) {
                                    console.log('Profile photos response:', profilePhotos);
                                    if (profilePhotos.total_count > 0 && profilePhotos.photos.length > 0) {
                                        const photoSizes = profilePhotos.photos[0];
                                        if (photoSizes && photoSizes.length > 0) {
                                            const largestPhoto = photoSizes[photoSizes.length - 1];
                                            const file = await bot.getFile(largestPhoto.file_id);
                                            if (file && file.file_path) {
                                                imageUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
                                                console.log('Successfully fetched bot profile photo via getUserProfilePhotos:', imageUrl);
                                            } else {
                                                console.log('File object is missing file_path:', file);
                                            }
                                        } else {
                                            console.log('No photo sizes available');
                                        }
                                    } else {
                                        console.log('No profile photos found');
                                    }
                                } else {
                                    console.log('No profile photos response');
                                }
                            } catch (err) {
                                console.error('Error fetching bot profile photo via getUserProfilePhotos:', err);
                            }
                        }
                    } catch (err: any) {
                        console.log('Failed to get bot information via getChat:', err.message);
                        // Fallback to minimal bot information
                        chat = {
                            type: 'bot',
                            title: username,
                            description: '',
                            photo: null
                        };
                        // console.log('Using fallback bot information');
                    }

                    // Bots don't have member counts, so set to 0
                    memberCount = 0;
                } else {
                    // Only use getChat for non-bot entities
                    chat = await bot.getChat('@' + username);
                    // console.log('chat: ' + JSON.stringify(chat));
                }
            } catch (err: any) {
                console.log('Failed to get chat:', err.message);
                throw new Error('Failed to fetch chat information');
            }
        }

        // For sticker packs, use sticker count instead of member count
        if (isSticker && stickerSet) {
            memberCount = stickerSet.stickers.length;
        }
        // For channels and groups, get member count
        else if (!isSticker && !isBot && chat.type !== 'private') {
            try {
                memberCount = await bot.getChatMemberCount('@' + username);
            } catch (err: any) {
                console.log('Failed to get member count:', err.message);
            }
        }

        // Get downloadable image URL if photo exists (only for non-sticker entities)
        if (!isSticker && chat.photo?.big_file_id) {
            try {
                const file = await bot.getFile(chat.photo.big_file_id);
                imageUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
            } catch (err: any) {
                console.log('Failed to get image URL:', err.message);
            }
        }

        // Check for NSFW content
        const nsfwKeywords = [
            '18+', 'nsfw', 'adult', 'xxx', 'porn', 'sex',
            'adult content', 'mature content', '21+', 'explicit'
        ];

        const contentToCheck = [
            chat.title?.toLowerCase() || '',
            chat.description?.toLowerCase() || '',
            username.toLowerCase()
        ].join(' ');

        const isNSFW = nsfwKeywords.some(keyword =>
            contentToCheck.includes(keyword.toLowerCase())
        );

        const mediaData = {
            url: url,
            name: chat.title || username,
            memberCount: memberCount,
            imageUrl,
            username: username,
            description: chat.description || '',
            type: isSticker ? 'sticker' : chat.type,
            isNSFW,
            isAnimatedSticker: isSticker && stickerSet?.stickers.some((sticker: any) => sticker.is_animated) || false,
            stickerSet: stickerSet ? {
                name: stickerSet.name,
                title: stickerSet.title,
                stickers: stickerSet.stickers.map((sticker: any) => ({
                    
                    fileId: sticker.file_id,
                    isAnimated:sticker.is_animated
                }))
            } : null
        };

        // console.log('mediaData: ' + JSON.stringify(mediaData));

        res.status(200).json(mediaData);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        res.status(500).json({
            error: "Failed to fetch media",
            message: errorMessage
        });
    }

}