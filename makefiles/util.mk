open-ci-page:
	open https://app.circleci.com/pipelines/github/avniproject/avni-client

open-checkout-hook:
	vi .git/hooks/post-checkout

s3-dump-page:
ifndef org
	@echo "Please provide organisation prefix as org param: org=xyz"
	exit 1
else
	open "https://s3.console.aws.amazon.com/s3/buckets/prod-user-media?region=ap-south-1&prefix=$(org)/&showversions=false"
endif

s3-prerelease-dump-page:
ifndef org
	@echo "Please provide organisation prefix as org param: org=xyz"
	exit 1
else
	open "https://s3.console.aws.amazon.com/s3/buckets/prerelease-user-media?region=ap-south-1&prefix=$(org)/&showversions=false"
endif
