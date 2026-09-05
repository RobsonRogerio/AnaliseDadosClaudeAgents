"""Tokens de dataviz portados de dashboard/lib/design-system.ts.

Só o modo light é portado (decisão de escopo para v1 — o dashboard Next.js
segue dark/light via CSS; aqui o chrome do Streamlit também é fixado em
light via .streamlit/config.toml para não haver descompasso).
"""
import plotly.graph_objects as go
import plotly.io as pio

# Paleta categórica: ordem fixa, nunca ciclar/reordenar.
# blue, orange, aqua, yellow, magenta, green, violet, red.
CATEGORICAL = [
    "#2a78d6",
    "#eb6834",
    "#1baf7a",
    "#eda100",
    "#e87ba4",
    "#008300",
    "#4a3aa7",
    "#e34948",
]

# Sequencial (magnitude), claro -> escuro, hue única.
SEQUENTIAL_BLUE = ["#cde2fb", "#9ec5f4", "#5598e7", "#2a78d6", "#1c5cab", "#0d366b"]

# Diverging (polaridade), azul <-> vermelho com meio neutro.
DIVERGING_COLORSCALE = [[0.0, "#2a78d6"], [0.5, "#f0efec"], [1.0, "#e34948"]]

# Cores de status — reservadas para callouts reais (outliers/anomalias),
# nunca reaproveitadas como cor de série comum.
STATUS = {
    "good": "#0ca30c",
    "warning": "#fab219",
    "serious": "#ec835a",
    "critical": "#d03b3b",
}

CHART_SURFACE = "#fcfcfb"
INK_PRIMARY = "#0b0b0b"
INK_SECONDARY = "#52514e"
INK_MUTED = "#898781"
GRIDLINE = "#e1e0d9"
AXIS_BASELINE = "#c3c2b7"
FONT_STACK = 'system-ui, -apple-system, "Segoe UI", sans-serif'

TEMPLATE_NAME = "design_system_light"


def register_template(name: str = TEMPLATE_NAME) -> None:
    """Registra um template Plotly com os tokens acima e o define como default.

    Chamar uma vez, em Home.py, antes de qualquer gráfico ser construído.
    """
    template = go.layout.Template(
        layout=go.Layout(
            colorway=CATEGORICAL,
            paper_bgcolor=CHART_SURFACE,
            plot_bgcolor=CHART_SURFACE,
            font=dict(family=FONT_STACK, color=INK_PRIMARY),
            xaxis=dict(
                gridcolor=GRIDLINE,
                linecolor=AXIS_BASELINE,
                zerolinecolor=AXIS_BASELINE,
                title=dict(font=dict(color=INK_SECONDARY)),
                tickfont=dict(color=INK_SECONDARY),
            ),
            yaxis=dict(
                gridcolor=GRIDLINE,
                linecolor=AXIS_BASELINE,
                zerolinecolor=AXIS_BASELINE,
                title=dict(font=dict(color=INK_SECONDARY)),
                tickfont=dict(color=INK_SECONDARY),
            ),
            legend=dict(font=dict(color=INK_SECONDARY)),
        )
    )
    pio.templates[name] = template
    pio.templates.default = name
