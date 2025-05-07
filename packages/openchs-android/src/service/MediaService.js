import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import SettingsService from "./SettingsService";
import RNFetchBlob from "rn-fetch-blob";
import General from "../utility/General";
import {get} from "../framework/http/requests";
import FileSystem from "../model/FileSystem";
import fs from 'react-native-fs';
import _ from "lodash";
import AvniError from "../framework/errorHandling/AvniError";

@Service("mediaService")
class MediaService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    init() {
        this.settingsService = this.getService(SettingsService);
    }

    downloadMedia(remoteFilePath, targetFilePath) {
        const settingsService = this.getService(SettingsService);
        const serverUrl = settingsService.getSettings().serverURL;
        return get(`${serverUrl}/media/signedUrl?url=${remoteFilePath}`)
            .then(downloadUrl => this.downloadFromUrl(downloadUrl, targetFilePath));
    }

    downloadFromUrl(url, targetFilePath, cb) {
        return RNFetchBlob
            .config({fileCache: true, path: targetFilePath})
            .fetch('GET', url, {})
            .progress((received, total) => {
                if (cb) cb(received, total);
            })
            .then((res) => {
                // Check if the file was downloaded successfully and has content
                if (res.info().status >= 200 && res.info().status < 300 && res.info().size > 330) {
                    General.logDebug("MediaService", `The file saved to: ${res.path()}`);
                    return targetFilePath;
                } else {
                    // If the file is empty or too small, delete it and throw an error
                    return fs.unlink(targetFilePath).then(() => {
                        const status = res.info().status;
                        let errorType = 'MediaDownloadError';
                        let userMessage = 'Unable to download media content.';
                        
                        if (status === 404) {
                            errorType = 'MediaNotFound';
                            userMessage = 'Media content not found on server.';
                        } else if (status === 403) {
                            errorType = 'MediaAccessDenied';
                            userMessage = 'Access denied to media content.';
                        } else if (status >= 500) {
                            errorType = 'MediaServerError';
                            userMessage = 'Server error while accessing media content.';
                        }
                        
                        // Create a user-friendly message and detailed reporting text
                        const reportingText = `${userMessage} [URL: ${url}]\nType: ${errorType}\nDetails: URL: ${url}, Status: ${status}, Size: ${res.info().size}\nTechnical: Downloaded file is invalid or empty: ${url}`;
                        
                        // Create an AvniError with user message and detailed reporting text
                        const avniError = AvniError.create(userMessage, reportingText, false); // Set to false to ensure it's displayed
                        avniError.type = errorType;
                        avniError.mediaUrl = url;
                        General.logDebug('MediaService', `Throwing AvniError: ${userMessage}`);
                        throw avniError;
                    });
                }
            })
            .catch(error => {
                // Try to clean up any partial files that might have been created
                return fs.exists(targetFilePath)
                    .then(exists => {
                        if (exists) {
                            return fs.unlink(targetFilePath);
                        }
                    })
                    .then(() => {
                        // Check if this is already an AvniError (from our own code)
                        if (error instanceof AvniError) {
                            throw error; // Re-throw existing AvniError
                        }
                        
                        // Create a new AvniError with detailed information
                        let errorType = 'MediaNetworkError';
                        let userMessage = 'Network error while downloading media content. Please check your internet connection.';
                        
                        // Extract error details for better reporting
                        const errorMessage = error.message || 'Unknown error';
                        const errorCode = error.code || 'N/A';
                        const errorStack = error.stack || '';
                        
                        // Create a detailed reporting text
                        const reportingText = `${userMessage} [URL: ${url}]\n` +
                            `Type: ${errorType}\n` +
                            `Details: URL: ${url}, Error Code: ${errorCode}` +
                            (errorMessage ? `\nTechnical: Failed to download media file: ${url}.\nError: ${errorMessage}` : `\nTechnical: Failed to download media file: ${url}.`) +
                            (errorStack ? `\nStack: ${errorStack}` : ``);
                        
                        // Create an AvniError with user message and detailed reporting text
                        const avniError = AvniError.create(userMessage, reportingText, false);
                        avniError.type = errorType;
                        avniError.mediaUrl = url;
                        avniError.originalError = error;
                        
                        General.logDebug('MediaService', `Throwing AvniError for network error: ${errorMessage}`);
                        throw avniError;
                    });
            });
    }

    getAbsolutePath(uri, type) {
        const typeToDirectoryMap = new Map([
            ['Video', FileSystem.getVideosDir],
            ['Image', FileSystem.getImagesDir],
            ['ImageV2', FileSystem.getImagesDir],
            ['Audio', FileSystem.getAudioDir],
            ['News', FileSystem.getNewsDir],
            ['File', FileSystem.getFileDir],
            ['Icons', FileSystem.getIconsDir],
            ['Metadata', FileSystem.getMetadataDir],
            ['Profile-Pics', FileSystem.getProfilePicsDir]
            ]);
        if (!uri) return '';
        const fileName = this.getFileName(uri);
        return `${typeToDirectoryMap.get(type)()}/${fileName}`.trim();
    }

    getFileName(uri) {
        return _.get(uri.trim().match(/[0-9A-Fa-f-]{36}\.\w+$/), 0);
    }
    


    exists(filePath) {
        if(_.isNil(filePath)) {
            return Promise.resolve(false);
        }
        return fs.exists(filePath);
    }

    async downloadFileIfRequired(s3Key, type) {
        if (_.isNil(s3Key)) {
            throw new Error('Cannot download media: Missing s3Key');
        }
        
        const filePathInDevice = this.getAbsolutePath(s3Key, type);
        if (!filePathInDevice) {
            throw new Error(`Cannot determine file path for media: ${s3Key}, type: ${type}`);
        }
        
        try {
            const exists = await this.exists(filePathInDevice);
            if (exists) {
                // Verify the existing file is valid (not empty)
                const fileStats = await fs.stat(filePathInDevice);
                if (fileStats.size <= 330) {
                    // File exists but is likely an empty placeholder, delete and re-download
                    await fs.unlink(filePathInDevice);
                    return await this.downloadMedia(s3Key, filePathInDevice);
                }
                return filePathInDevice;
            } else {
                // File doesn't exist, download it
                return await this.downloadMedia(s3Key, filePathInDevice);
            }
        } catch (error) {
            General.logDebug('ImageDownloadService', `Error while downloading image with s3 key ${s3Key}`);
            General.logDebug('ImageDownloadService', error);
            
            // Make sure we don't leave partial files
            try {
                const fileExists = await this.exists(filePathInDevice);
                if (fileExists) {
                    await fs.unlink(filePathInDevice);
                }
            } catch (cleanupError) {
                General.logDebug('ImageDownloadService', `Error cleaning up file: ${cleanupError.message}`);
            }
            
            // If the error is already categorized, just propagate it
            if (error.type && error.details) {
                throw error;
            }
            
            // Otherwise, categorize the error
            let errorType = 'MediaDownloadError';
            let userMessage = 'Unable to download media content.';
            
            // Check for network errors - with proper null checks
            const errorMessage = _.get(error, 'message', '');
            if (errorMessage && (
                errorMessage.includes('Network request failed') || 
                errorMessage.includes('timeout') || 
                errorMessage.includes('connection') ||
                errorMessage.includes('ENOTFOUND')
            )) {
                errorType = 'MediaNetworkError';
                userMessage = 'Network error while downloading media. Please check your internet connection.';
            }
            
            // Extract more detailed error information
            const errorCode = _.get(error, 'code', 'N/A');
            const errorStack = _.get(error, 'stack', '');
            const errorStatus = _.get(error, 'status', '');
            
            // Create a more comprehensive reporting text with all available details
            const reportingText = `${userMessage} [URL: ${s3Key}, Type: ${type || 'unknown'}]\n` +
                `Type: ${errorType}\n` +
                `Details: URL: ${s3Key}, Type: ${type}, Error Code: ${errorCode}, Error Status: ${errorStatus}` +
                (errorMessage ? `\nTechnical: Failed to download media file: ${s3Key}.\nError: ${errorMessage}` : `\nTechnical: Failed to download media file: ${s3Key}.`) +
                (errorStack ? `\nStack: ${errorStack}` : ``);
            
            // Create an AvniError with user message and detailed reporting text
            const avniError = AvniError.create(userMessage, reportingText, false); // Set to false to ensure it's displayed
            avniError.type = errorType;
            avniError.mediaUrl = s3Key;
            avniError.mediaType = type;
            avniError.originalError = error;
            General.logDebug('MediaService', `Throwing AvniError: ${userMessage}`);
            throw avniError;
        }
    }
}

export default MediaService;
