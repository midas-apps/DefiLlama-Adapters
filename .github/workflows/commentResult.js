const { readFileSync } = require('node:fs');
const axios = require('axios');

async function main() {
  const [, , logPath, author, repository, pullRequest, adapterPath] = process.argv;
  const token = process.env.GITHUB_TOKEN;

  if (!logPath || !author || !repository || !pullRequest) {
    throw new Error('Usage: commentResult.js <log> <owner> <repository> <pull-request> [adapter-path]');
  }
  if (!token) {
    throw new Error('GITHUB_TOKEN is required to publish a pull-request comment');
  }

  const pullRequestNumber = Number(pullRequest);
  if (!Number.isInteger(pullRequestNumber) || pullRequestNumber < 1) {
    throw new Error(`Invalid pull-request number: ${pullRequest}`);
  }

  const log = readFileSync(logPath, 'utf8');
  const errorString = '------ ERROR ------';
  const summaryIndex = log.indexOf('------ TVL ------');
  const errorIndex = log.indexOf(errorString);
  let body;

  if (summaryIndex !== -1) {
    body = `The adapter at ${adapterPath} exports TVL: \n\n${log
      .substring(summaryIndex + 17)
      .replaceAll('\n', '\n    ')}`;
  } else if (errorIndex !== -1) {
    body = `Error while running adapter at ${adapterPath ?? ''}: \n\n${log
      .split(errorString)[1]
      .replaceAll('\n', '\n    ')}`;
  } else {
    return;
  }

  await axios.post(
    `https://api.github.com/repos/${encodeURIComponent(author)}/${encodeURIComponent(repository)}/issues/${pullRequestNumber}/comments`,
    { body },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
