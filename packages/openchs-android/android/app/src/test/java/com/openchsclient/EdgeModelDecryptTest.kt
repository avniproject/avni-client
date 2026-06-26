package com.openchsclient

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.AEADBadTagException
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

class EdgeModelDecryptTest {

    @get:Rule
    val tmp = TemporaryFolder()

    private val rng = SecureRandom()

    private fun newKey(): ByteArray =
        KeyGenerator.getInstance("AES").apply { init(256) }.generateKey().encoded

    private fun sha256Hex(bytes: ByteArray): String =
        MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }

    // Builds the module's wire format: [12-byte IV][ciphertext][16-byte GCM tag].
    private fun encrypt(plaintext: ByteArray, key: ByteArray): ByteArray {
        val iv = ByteArray(12).also { rng.nextBytes(it) }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(128, iv))
        val ciphertextAndTag = cipher.doFinal(plaintext) // GCM appends the 16-byte tag
        return iv + ciphertextAndTag
    }

    private fun writeBlob(bytes: ByteArray): File =
        tmp.newFile().also { it.writeBytes(bytes) }

    @Test
    fun decryptsValidBlobAndMatchesPlaintextAndSha() {
        // ~150 KB so the decrypt loop spans more than one 64 KB chunk (boundary coverage).
        val plaintext = ByteArray(150_000).also { rng.nextBytes(it) }
        val key = newKey()
        val blob = writeBlob(encrypt(plaintext, key))
        val out = File(tmp.root, "decrypted.out")

        EdgeModelModule.decryptFileToFile(src = blob, key = key.copyOf(), expectedSha256Hex = sha256Hex(plaintext), outFile = out)

        assertArrayEquals("decrypted bytes must equal the original plaintext", plaintext, out.readBytes())
        assertEquals("SHA-256 of the decrypted output must match", sha256Hex(plaintext), sha256Hex(out.readBytes()))
    }

    @Test
    fun rejectsShaMismatchAndDeletesOutput() {
        val plaintext = "hello edge model".toByteArray()
        val key = newKey()
        val blob = writeBlob(encrypt(plaintext, key))
        val out = File(tmp.root, "sha-mismatch.out")

        try {
            EdgeModelModule.decryptFileToFile(blob, key.copyOf(), "deadbeef".repeat(8), out)
            fail("expected SecurityException on SHA-256 mismatch")
        } catch (e: SecurityException) {
            assertTrue(e.message!!.contains("SHA-256 mismatch"))
        }
    }

    @Test
    fun wrongKeyThrowsAeadBadTag() {
        val plaintext = ByteArray(4096).also { rng.nextBytes(it) }
        val correctKey = newKey()
        val wrongKey = newKey()
        val blob = writeBlob(encrypt(plaintext, correctKey))
        val out = File(tmp.root, "wrong-key.out")

        try {
            EdgeModelModule.decryptFileToFile(blob, wrongKey.copyOf(), sha256Hex(plaintext), out)
            fail("expected AEADBadTagException with the wrong key")
        } catch (e: AEADBadTagException) {
            // expected — GCM auth tag mismatch
        }
        if (out.exists()) {
            assertFalse("partial output must not equal the real plaintext", out.readBytes().contentEquals(plaintext))
        }
    }

    @Test
    fun truncatedBlobBelowIvLengthRejectedCleanly() {
        val blob = writeBlob(ByteArray(5)) // < 12-byte IV
        val out = File(tmp.root, "truncated.out")

        try {
            EdgeModelModule.decryptFileToFile(blob, newKey(), "00".repeat(32), out)
            fail("expected IllegalArgumentException for a sub-IV-length blob")
        } catch (e: IllegalArgumentException) {
            assertTrue("message should name the truncation, not a buffer underflow", e.message!!.contains("truncated"))
        }
    }

    @Test
    fun missingFileRejectedCleanly() {
        val out = File(tmp.root, "missing.out")
        try {
            EdgeModelModule.decryptFileToFile(File(tmp.root, "does-not-exist.bin"), newKey(), "00".repeat(32), out)
            fail("expected FileNotFoundException for a missing blob")
        } catch (e: java.io.FileNotFoundException) {
            assertTrue(e.message!!.contains("missing or unreadable"))
        }
    }
}
