expect -c '
set timeout -1;
spawn android update sdk --all --no-ui --filter android-21,extra-android-m2repository,build-tools-21.1.2,platform-tools,sys-img-x86_64-android-21,sys-img-x86-android-21,extra-google-m2repository;
expect {
    "Do you accept the license" { exp_send "y\r" ; exp_continue }
    eof
}
'
