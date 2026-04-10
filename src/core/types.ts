export type AurSearchResult = {
  ID: number;
  Name: string;
  PackageBase: string;
  Version: string;
  Description: string | null;
  NumVotes: number;
  Popularity: number;
  OutOfDate: number | null;
  Maintainer: string | null;
};

export type AurInfoResult = AurSearchResult & {
  Depends: string[];
  MakeDepends: string[];
  CheckDepends: string[];
  OptDepends: string[];
  Conflicts: string[];
  Provides: string[];
  Replaces: string[];
  License: string[];
  URL: string | null;
  URLPath: string;
  Keywords: string[];
  FirstSubmitted: number;
  LastModified: number;
};

export type AurResponse<T> = {
  version: number;
  type: string;
  resultcount: number;
  results: T[];
};

export type ResolvedPackage = {
  name: string;
  version: string;
  packageBase: string;
  depends: string[];
  makeDepends: string[];
};

export type InstallPlan = {
  syncPackages: string[];
  aurPackages: ResolvedPackage[];
};
