from setuptools import setup, find_packages

setup(
    name="cf_tsm",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "requests",
    ],
    entry_points={
        "console_scripts": [
            "tsm-admin=cf_tsm.cli:main",
        ],
    },
    author="Boris Manojlovic",
    author_email="boris@steki.net",
    description="Terraform State Manager CLI",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    url="https://github.com/bmanojlovic/terraform-state-manager",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.6",
)
