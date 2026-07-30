# Development checks

## Python

The Pro-Flow test suite uses Python's built-in `unittest` runner. `pytest` is
not required.

Install the development dependency:

```powershell
python -m pip install -r requirements-dev.txt
```

Run the complete Python suite:

```powershell
python -m unittest discover -s tests -v
```

## Shared career contracts

Install and verify the standalone shared package:

```powershell
Set-Location packages/career-core
npm install
npm test
npm run typecheck
```

The package contains schemas and service contracts only. It must not contain
real candidate data, secrets, provider credentials, or generated application
documents.
