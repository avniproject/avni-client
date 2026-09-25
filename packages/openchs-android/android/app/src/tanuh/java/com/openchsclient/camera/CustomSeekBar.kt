package com.openchsclient.camera

import android.content.Context
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import android.util.AttributeSet
import androidx.appcompat.widget.AppCompatSeekBar
import com.openchsclient.R

/**
 * Zoom slider whose track is drawn as a measuring-tape style drawable (set via the
 * `app:measuringTapeDrawable` custom attribute, declared in `camera_attrs.xml`).
 *
 * Ported from fhir-app's `CustomSeekBar`. Two adaptations for avni-client, both non-behavioral:
 *  - fhir-app pulled a transparent color from a third-party FHIR SDK module it happens to
 *    depend on (`com.google.android.fhir.datacapture.contrib.views.barcode.R.color.transparent`);
 *    avni-client has no such dependency, so this uses the standard platform
 *    `android.R.color.transparent` instead — same visual result, no new dependency required.
 *  - `R` is `com.openchsclient.R` (this app's generated resource class) instead of fhir-app's
 *    `org.smartregister.fhircore.quest.R`.
 */
class CustomSeekBar(context: Context, attrs: AttributeSet) : AppCompatSeekBar(context, attrs) {

    private val measuringTapeDrawable: Drawable

    init {
        val typedArray = context.obtainStyledAttributes(attrs, R.styleable.CameraCustomSeekBar)
        measuringTapeDrawable = typedArray.getDrawable(R.styleable.CameraCustomSeekBar_measuringTapeDrawable)
            ?: throw IllegalArgumentException("Missing measuringTapeDrawable attribute")
        typedArray.recycle()

        // Set progress drawable to transparent — the measuring-tape drawable below is what's
        // actually visible; the SeekBar's own progress fill would otherwise draw on top of it.
        progressDrawable = context.getDrawable(android.R.color.transparent)
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        measuringTapeDrawable.setBounds(0, 0, width - 8, height)
        measuringTapeDrawable.draw(canvas)
    }
}
