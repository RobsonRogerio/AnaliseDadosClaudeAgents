"""Helpers estatísticos puros — sem import de streamlit ou db.

Isolados de propósito: são o único ponto deste app fácil de cobrir com
pytest no futuro (mesmo espírito de dashboard/*/utils.ts), caso o app
cresça de "exploratório" para algo usado no dia a dia.
"""
import pandas as pd


def iqr_bounds(series: pd.Series, k: float = 1.5) -> tuple[float, float]:
    """Limites inferior/superior de outlier pelo método IQR (Tukey)."""
    q1, q3 = series.quantile(0.25), series.quantile(0.75)
    iqr = q3 - q1
    return q1 - k * iqr, q3 + k * iqr


def flag_outliers(df: pd.DataFrame, column: str, k: float = 1.5) -> pd.DataFrame:
    """Retorna as linhas de df cuja `column` está fora dos limites IQR."""
    low, high = iqr_bounds(df[column], k=k)
    return df[(df[column] < low) | (df[column] > high)]


def coefficient_of_variation(mean: float, std: float) -> float:
    """CV = desvio padrão / média. NaN se a média for zero."""
    if mean == 0:
        return float("nan")
    return std / mean


def pearson_r(a: pd.Series, b: pd.Series) -> float:
    """Correlação de Pearson entre duas séries, ignorando NaN pareado."""
    return a.corr(b, method="pearson")
