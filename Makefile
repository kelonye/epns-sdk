run:
	@yarn start

build: ts-dist/index.js

ts-dist/index.js: $(shell find lib -type f)
	yarn prepublish

.PHONY: run build
