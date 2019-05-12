define _upload_apk_to_playstore
	cd packages/openchs-android/android && bundle exec fastlane $1
endef

upload_to_internal_test_track:
	$(call _upload_apk_to_playstore,upload_to_internal_test)

upload_to_alpha_track:
	$(call _upload_apk_to_playstore,upload_to_alpha)