# Board card movement: make pickup issue=1866  |  make done issue=1861 1862
# Actions: pickup, done, review, cr-comments, qa-ready, or any status slug
board:
ifndef action
	@echo "Usage: make board action=<action> issue=<num> [issue2=<num> ...]"
	@echo "Actions: pickup | done | review | cr-comments | qa-ready | <status-slug>"
	exit 1
else
	./scripts/board.sh $(action) $(issue) $(issue2) $(issue3) $(issue4) $(issue5) $(issue6)
endif

pickup:
ifndef issue
	@echo "Usage: make pickup issue=<num> [issue2=<num> ...]"
	exit 1
else
	./scripts/board.sh pickup $(issue) $(issue2) $(issue3) $(issue4) $(issue5) $(issue6)
endif

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
