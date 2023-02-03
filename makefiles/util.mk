open-ci-page:
	open https://app.circleci.com/pipelines/github/avniproject/avni-client

open-checkout-hook:
	vi .git/hooks/post-checkout

s3-dump-page:
ifndef org
	@echo "Please provide org prefix in org param"
	exit 1
else
	open "https://s3.console.aws.amazon.com/s3/buckets/prod-user-media?region=ap-south-1&prefix=$(org)/&showversions=false"
endif
