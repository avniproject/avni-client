import AsyncStorage from '@react-native-async-storage/async-storage';
import _ from 'lodash';
import General from '../../utility/General';
import SessionUsername from '../SessionUsername';

const KEY = 'avni.formResume';
export const RESUME_WINDOW_MINUTES = 60;
// Starts in a row where the resumed form never opened; stops a resume that crashes from looping for an hour.
const MAX_UNFINISHED_RESUMES = 3;

export const FormResumeType = {
    PersonRegistration: 'PersonRegistration',
    SubjectRegistration: 'SubjectRegistration',
    Encounter: 'Encounter',
    ProgramEncounter: 'ProgramEncounter',
    ProgramEnrolment: 'ProgramEnrolment',
};

// Written when a form goes to the background and removed once the user is back with the app in front,
// so it survives only when Android killed the app with the form open.
class FormResume {
    static async remember(type, draftUUID, pageNumber, now = Date.now()) {
        try {
            const existing = await FormResume._read();
            // Android can restart Avni unseen and close the resumed form again, so the clock runs from the first close.
            const sameForm = !_.isNil(existing) && existing.type === type && existing.draftUUID === draftUUID;
            await FormResume._write({
                type,
                draftUUID,
                pageNumber,
                username: await SessionUsername.get(),
                backgroundedAt: sameForm ? existing.backgroundedAt : now,
                unfinishedResumes: sameForm ? existing.unfinishedResumes : 0,
            });
        } catch (e) {
            General.logWarn('FormResume', `Failed to remember the open form: ${e.message}`);
        }
    }

    static async forget() {
        try {
            await AsyncStorage.removeItem(KEY);
        } catch (e) {
            General.logWarn('FormResume', `Failed to forget the open form: ${e.message}`);
        }
    }

    static async resumedFormOpened() {
        const entry = await FormResume._read();
        if (!_.isNil(entry)) await FormResume._write({...entry, unfinishedResumes: 0});
    }

    // Left in place, not removed, so a resumed form that Android closes again before the user returns resumes again.
    static async take(now = Date.now()) {
        try {
            const entry = await FormResume._read();
            if (_.isNil(entry)) return null;
            const expired = now - entry.backgroundedAt > RESUME_WINDOW_MINUTES * 60 * 1000;
            if (expired || entry.unfinishedResumes >= MAX_UNFINISHED_RESUMES || entry.username !== await SessionUsername.get()) {
                await FormResume.forget();
                return null;
            }
            await FormResume._write({...entry, unfinishedResumes: entry.unfinishedResumes + 1});
            return entry;
        } catch (e) {
            General.logWarn('FormResume', `Failed to read the open form: ${e.message}`);
            return null;
        }
    }

    static async _read() {
        const value = await AsyncStorage.getItem(KEY);
        return _.isNil(value) ? null : JSON.parse(value);
    }

    static async _write(entry) {
        await AsyncStorage.setItem(KEY, JSON.stringify(entry));
    }
}

export default FormResume;
