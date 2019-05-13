define _upload_apk_to_playstore
	cd packages/openchs-android/android && bundle exec fastlane $1
endef

define _create_release_notes
	$(call _get_abi_version,$1)
	cp packages/openchs-android/android/fastlane/metadata/android/en-GB/source-changelog/$(version).txt packages/openchs-android/android/fastlane/metadata/android/en-GB/changelogs/$(abiVersion).txt
endef

define _create_release_notes_for_all_builds
	$(call _create_release_notes,1)
	$(call _create_release_notes,2)
	$(call _create_release_notes,3)
	$(call _create_release_notes,4)
endef

create_release_notes:
	$(call _create_release_notes_for_all_builds)

upload_to_internal_test_track: create_release_notes
	$(call _upload_apk_to_playstore,upload_to_internal_test)

upload_to_alpha_track: create_release_notes
	$(call _upload_apk_to_playstore,upload_to_alpha)