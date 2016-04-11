if [ ! -d /usr/local/opt/android-sdk/extras/google/m2repository ]; then
  expect -c '
  set timeout -1;
  spawn android update sdk --all --no-ui --filter extra-google-m2repository;
  expect {
      "Do you accept the license" { exp_send "y\r" ; exp_continue }
      eof
  }
  '
fi

if [ ! -d /usr/local/opt/android-sdk/extras/android/m2repository ]; then
  expect -c '
  set timeout -1;
  spawn android update sdk --all --no-ui --filter extra-android-m2repository;
  expect {
      "Do you accept the license" { exp_send "y\r" ; exp_continue }
      eof
  }
  '
fi
