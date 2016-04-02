expect -c '
set timeout -1;
spawn android update sdk --all --no-ui --filter extra-google-m2repository;
expect {
    "Do you accept the license" { exp_send "y\r" ; exp_continue }
    eof
}
'

expect -c '
set timeout -1;
spawn android update sdk --all --no-ui --filter extra-android-m2repository;
expect {
    "Do you accept the license" { exp_send "y\r" ; exp_continue }
    eof
}
'
