ansible_exists := $(shell ansible-playbook --version)
ansible_check:
ifndef ansible_exists
	brew install ansible
endif

install: ansible_check
				 ansible-playbook setup/local.yml -i setup/local
