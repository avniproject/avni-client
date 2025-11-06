import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import SettingsService from "./SettingsService";
import RNFetchBlob from "react-native-blob-util";
import General from "../utility/General";
import {get} from "../framework/http/requests";
import FileSystem from "../model/FileSystem";
import fs from 'react-native-fs';
import _ from "lodash";
import AvniError from "../framework/errorHandling/AvniError";

const MIN_FILE_SIZE_IN_BYTES = 1024;

function categorizeAndThrowAvniError(error, s3Key, type) {
    let errorType = 'MediaDownloadError';
    let userMessage = 'unableToFetchImagesError';

    // Check for network errors - with proper null checks
    const errorMessage = _.get(error, 'message', '');
    if (errorMessage && (
      errorMessage.includes('Network request failed') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('ENOTFOUND')
    )) {
        errorType = 'MediaNetworkError';
        userMessage = 'syncTimeoutError';
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

async function cleanUpPartialFiles(filePathInDevice) {
    try {
        const fileExists = await this.exists(filePathInDevice);
        if (fileExists) {
            await fs.unlink(filePathInDevice);
        }
    } catch (cleanupError) {
        General.logDebug('MediaService', `Error cleaning up partial file: ${cleanupError.message}`);
    }
}

function createNetworkAvniErrorDuringMediaDownload(error, url) {
    let errorType = 'MediaNetworkError';
    let userMessage = 'syncTimeoutError';

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
}

function createMediaDownloadAvniError(res, url) {
    const status = res.info().status;
    let errorType = 'MediaDownloadError';
    let userMessage = 'unableToFetchImagesError';

    if (status === 404) {
        errorType = 'MediaNotFound';
    } else if (status === 403) {
        errorType = 'MediaAccessDenied';
    } else if (status >= 500) {
        errorType = 'MediaServerError';
    }

    // Create a user-friendly message and detailed reporting text
    const reportingText = `${userMessage} [URL: ${url}]\nType: ${errorType}\nDetails: URL: ${url}, Status: ${status}, Size: ${res.info().size}\nTechnical: Downloaded file is invalid or empty: ${url}`;

    // Create an AvniError with user message and detailed reporting text
    const avniError = AvniError.create(userMessage, reportingText, false); // Set to false to ensure it's displayed
    avniError.type = errorType;
    avniError.mediaUrl = url;
    General.logDebug('MediaService', `Throwing AvniError: ${userMessage}`);
    throw avniError;
}

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
                // Check if the file was downloaded successfully
                const status = res.info().status;
                const size = res.info().size;
                
                General.logDebug("MediaService", `Download response: status=${status}, size=${size}, path=${res.path()}`);
                
                // If status is successful and either size is undefined (can't check) or size is reasonable
                if (status >= 200 && status < 300 && (size === undefined || size > MIN_FILE_SIZE_IN_BYTES)) {
                    // Verify the file exists and has content
                    return fs.stat(targetFilePath)
                        .then(stats => {
                            if (stats.size > 0) {
                                General.logDebug("MediaService", `The file saved to: ${res.path()} with size ${stats.size}`);
                                return targetFilePath;
                            } else {
                                General.logDebug("MediaService", `File exists but has zero size: ${targetFilePath}`);
                                return fs.unlink(targetFilePath).then(() => {
                                    throw new Error('Downloaded file has zero size');
                                });
                            }
                        })
                        .catch(statError => {
                            General.logDebug("MediaService", `Error checking file stats: ${statError.message}`);
                            return fs.unlink(targetFilePath).then(() => {
                                throw new Error(`Error verifying downloaded file: ${statError.message}`);
                            });
                        });
                } else {
                    // If the file is empty or too small, delete it and throw an error
                    return fs.unlink(targetFilePath).then(() => {
                        createMediaDownloadAvniError(res, url);
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
                        createNetworkAvniErrorDuringMediaDownload(error, url);
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

    async downloadMediaFromS3ToPath(s3Key, filePathInDevice, ignoreFetchErrors = true) {
        try {
            return await this.downloadMedia(s3Key, filePathInDevice);
        } catch (downloadError) {
            if (ignoreFetchErrors) {
                General.logDebug('MediaService', `Ignoring download error for ${s3Key}: ${downloadError.message}`);
                return null;
            }
            throw downloadError;
        }
    }

    async downloadFileIfRequired(s3Key, type, ignoreFetchErrors = true) {
        let filePathInDevice = '';
        try {
            if (_.isNil(s3Key)) {
                General.logDebug('MediaService', 'Ignoring error: Missing s3Key');
                return null;
            }

            filePathInDevice = this.getAbsolutePath(s3Key, type);
            if (!filePathInDevice) {
                General.logDebug('MediaService', `Cannot determine file path for media: ${s3Key}, type: ${type}`);
                throw new Error(`Cannot determine file path for media: ${s3Key}, type: ${type}`);
            }

            const exists = await this.exists(filePathInDevice);
            if (exists) {
                // Verify the existing file is valid (not empty)
                const fileStats = await fs.stat(filePathInDevice);
                if (fileStats.size <= MIN_FILE_SIZE_IN_BYTES) {
                    // File exists but is likely an empty placeholder, delete and re-download
                    await fs.unlink(filePathInDevice);
                    return await this.downloadMediaFromS3ToPath(s3Key, filePathInDevice, ignoreFetchErrors);
                }
                return filePathInDevice;
            } else {
                // File doesn't exist, download it
                return await this.downloadMediaFromS3ToPath(s3Key, filePathInDevice, ignoreFetchErrors);
            }
        } catch (error) {
            General.logDebug('MediaService', `Error while downloading image with s3 key ${s3Key}`);
            General.logDebug('MediaService', error);
            
            // Make sure we don't leave partial files
            await cleanUpPartialFiles.call(this, filePathInDevice);

            // If we're ignoring fetch errors, return null instead of throwing
            if (ignoreFetchErrors) {
                General.logDebug('MediaService', `Ignoring error for ${s3Key} due to ignoreFetchErrors flag`);
                return null;
            }
            
            // Check if this is already an AvniError (from our own code)
            if (error instanceof AvniError) {
                error.userMessage = 'unableToFetchImagesError';
                throw error;
            }
            
            // Otherwise, categorize the error
            categorizeAndThrowAvniError(error, s3Key, type);
        }
    }
}

export default MediaService;
