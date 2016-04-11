if [ ! -d /usr/local/opt/android-sdk/system-images/android-23/default/x86_64 ]; then
  expect -c '
  set timeout -1;
  spawn android update sdk --all --no-ui --filter sys-img-x86_64-android-23;
  expect {
      "Do you accept the license" { exp_send "y\r" ; exp_continue }
      eof
  }
  '
fi

if [ ! -d /usr/local/opt/android-sdk/system-images/android-23/default/x86 ]; then
  expect -c '
  set timeout -1;
  spawn android update sdk --all --no-ui --filter sys-img-x86-android-23;
  expect {
      "Do you accept the license" { exp_send "y\r" ; exp_continue }
      eof
  }
  '
fi
