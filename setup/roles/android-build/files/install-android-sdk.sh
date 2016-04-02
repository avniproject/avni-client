expect -c '
set timeout -1;
spawn android update sdk --all --no-ui --filter android-23;
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

expect -c '
set timeout -1;
spawn android update sdk --all --no-ui --filter build-tools-23.0.3;
expect {
    "Do you accept the license" { exp_send "y\r" ; exp_continue }
    eof
}
'

expect -c '
set timeout -1;
spawn android update sdk --all --no-ui --filter platform-tools;
expect {
    "Do you accept the license" { exp_send "y\r" ; exp_continue }
    eof
}
'

expect -c '
set timeout -1;
spawn android update sdk --all --no-ui --filter sys-img-x86_64-android-23;
expect {
    "Do you accept the license" { exp_send "y\r" ; exp_continue }
    eof
}
'

expect -c '
set timeout -1;
spawn android update sdk --all --no-ui --filter sys-img-x86-android-23;
expect {
    "Do you accept the license" { exp_send "y\r" ; exp_continue }
    eof
}
'

expect -c '
set timeout -1;
spawn android update sdk --all --no-ui --filter extra-google-m2repository;
expect {
    "Do you accept the license" { exp_send "y\r" ; exp_continue }
    eof
}
'
